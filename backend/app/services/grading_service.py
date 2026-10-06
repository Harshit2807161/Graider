"""Main grading pipeline service."""

from pathlib import Path
from typing import Optional
from uuid import UUID

import structlog
from sqlmodel import Session

from app.core.config import get_settings
from app.core.constants import SubmissionStatus
from app.core.db import engine
from app.core.llm_protection import protector
from app import crud
from app.models.exam import Question as DBQuestion, Submission, SubmissionAnswer
from app.schemas.grading import (
    Answer,
    GradingResult,
    Question as GraderQuestion,
    QuestionType as GraderQuestionType,
    RubricCriteria,
)
from .ocr_service import get_ocr_service
from .triplet_service import get_triplet_service
from app.agents.orchestrator import get_orchestrator
from app.models.base import utcnow

logger = structlog.get_logger(__name__)


def question_label(index: int) -> str:
    """Short, stable id ("Q1", "Q2", ...) that the OCR model can echo back reliably."""
    return f"Q{index + 1}"


def rubric_from_text(label: str, rubric_text: Optional[str]) -> Optional[RubricCriteria]:
    """Turn a teacher's free-text rubric into rubric criteria (one point per non-empty line)."""
    if not rubric_text or not rubric_text.strip():
        return None
    points = [line.strip(" \t-•*") for line in rubric_text.splitlines()]
    points = [p for p in points if p]
    return RubricCriteria(question_id=label, expected_points=points)


def _to_grader_question(label: str, q: DBQuestion) -> GraderQuestion:
    return GraderQuestion(
        id=label,
        text=q.question_text,
        max_score=q.max_score,
        question_type=GraderQuestionType(q.question_type.value),
    )


def _set_progress(db: Session, submission: Submission, step: str, **fields) -> None:
    crud.submission.update(db, db_obj=submission, obj_in={"current_step": step, **fields})


async def run_grading_pipeline(submission_id: UUID, answers_path: str) -> None:
    """
    Grade one submission against its exam's questions (stored in the database).

    Steps: OCR the answer sheet -> pair answers with questions + rubrics -> grade each
    pair with the agent graph -> save per-question results and totals.
    """
    settings = get_settings()
    with Session(engine) as db:
        submission = crud.submission.get(db, id=submission_id)
        if not submission:
            logger.error("submission_not_found", submission_id=str(submission_id))
            return

        try:
            with protector.budget(settings.LLM_MAX_CALLS_PER_SUBMISSION):
                await _grade(db, submission, Path(answers_path))
        except Exception as e:
            logger.exception("pipeline_error", submission_id=str(submission_id), error=str(e))
            # A failed flush/commit leaves the session unusable until rolled back
            db.rollback()
            try:
                submission = crud.submission.get(db, id=submission_id)
                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={
                        "status": SubmissionStatus.FAILED,
                        "current_step": f"Error: {str(e)[:400]}",
                    },
                )
            except Exception:
                logger.exception("failed_to_update_submission_status", submission_id=str(submission_id))


async def _grade(db: Session, submission: Submission, answers_path: Path) -> None:
    submission_id = str(submission.id)
    _set_progress(db, submission, "Loading questions...", status=SubmissionStatus.PROCESSING)

    # Ordered, non-deleted questions (exam.questions includes soft-deleted rows)
    db_questions = crud.question.get_by_exam(db, exam_id=submission.exam_id)
    if not db_questions:
        raise ValueError("This exam has no questions configured.")

    labels = [question_label(i) for i in range(len(db_questions))]
    db_question_by_label = dict(zip(labels, db_questions))
    questions = [_to_grader_question(label, q) for label, q in db_question_by_label.items()]
    rubrics = [
        r for r in (rubric_from_text(label, q.rubric_criteria) for label, q in db_question_by_label.items())
        if r is not None
    ]

    # ===== Step 1: OCR =====
    logger.info("pipeline_step", step="ocr", submission_id=submission_id)
    _set_progress(db, submission, f"Reading answer sheet for {len(questions)} questions...")
    answers: list[Answer] = await get_ocr_service().extract_answers(answers_path, questions)
    if not answers:
        # The model read the sheet but matched nothing; grading would award all zeros.
        raise ValueError(
            "No answers could be matched to the exam's questions. "
            "Check that the uploaded file is this exam's answer sheet."
        )

    # ===== Step 2: Triplet Formation =====
    logger.info("pipeline_step", step="triplets", submission_id=submission_id)
    triplets = get_triplet_service().form_triplets(questions, answers, rubrics)
    answer_text_by_label = {t.question_id: t.candidate_answer for t in triplets}
    _set_progress(db, submission, f"Matched {len(answers)} answers. Starting grading...")

    # ===== Step 3: Agent Grading =====
    logger.info("pipeline_step", step="grading", submission_id=submission_id)
    orchestrator = get_orchestrator()
    results: list[GradingResult] = []
    for i, triplet in enumerate(triplets):
        _set_progress(db, submission, f"Grading question {triplet.question_id} ({i + 1}/{len(triplets)})")
        result = await orchestrator.grade_triplet(triplet)
        results.append(result)
        logger.info(
            "question_graded",
            submission_id=submission_id,
            question_id=triplet.question_id,
            score=result.score,
            max_score=result.max_score,
            grader=result.grader,
        )

    # ===== Step 4: Save results (one transaction) =====
    logger.info("pipeline_step", step="save_results", submission_id=submission_id)
    for old_answer in crud.submission_answer.get_by_submission(db, submission_id=submission.id):
        db.delete(old_answer)

    for result in results:
        db_question = db_question_by_label[result.question_id]
        db.add(SubmissionAnswer(
            submission_id=submission.id,
            question_id=db_question.id,
            student_answer_text=answer_text_by_label.get(result.question_id),
            score=result.score,
            feedback=result.feedback,
            reasoning=result.reasoning,
        ))

    total_score = sum(r.score for r in results)
    max_total_score = sum(q.max_score for q in db_questions)
    submission.status = SubmissionStatus.GRADED
    submission.total_score = total_score
    submission.max_score = max_total_score
    submission.percentage = (total_score / max_total_score * 100) if max_total_score > 0 else 0
    submission.current_step = "Grading complete"
    submission.updated_at = utcnow()
    db.add(submission)
    db.commit()

    logger.info("pipeline_complete", submission_id=submission_id, score=f"{total_score}/{max_total_score}")
