"""Main grading pipeline service."""

from pathlib import Path
from typing import Optional
from uuid import UUID

import structlog
from sqlmodel import Session

from app.core.constants import SubmissionStatus
from app.core.db import engine
from app.llm.budget import budget
from app.llm.config import get_llm_settings
from app.llm.recorder import recording_to
from app.llm.router import run_router
from app.audit.recorder import DbCallRecorder
from app.audit.runs import finish_run, set_trace_id, start_run
from app.models.audit import GradingRun, RunStatus
from app.models.rubric import RubricSpecRecord, RubricStatus
from app.rubrics.schema import RubricSpec
from app.rubrics.service import ensure_rubric_specs
from app.observability.tracing import run_trace
from app.llm.types import CallContext
from app import crud
from app.models.exam import Question as DBQuestion, Submission, SubmissionAnswer
from app.schemas.grading import (
    Answer,
    GradingResult,
    Question as GraderQuestion,
    QuestionType as GraderQuestionType,
    RubricCriteria,
)
from .labels import exam_labels
from .ocr_service import SheetPage, get_ocr_service
from app.ingestion.pages import DocumentError
from app.ingestion.service import submission_pages
from .triplet_service import get_triplet_service
from app.agents.orchestrator import get_orchestrator
from app.models.base import utcnow

logger = structlog.get_logger(__name__)


class RubricNotReady(ValueError):
    """A question's rubric spec can't be graded against (invalid, or parsing failed)."""


def criteria_for_grader(label: str, spec: RubricSpec) -> RubricCriteria:
    """Present a parsed rubric spec to the current graders as a list of rubric points."""
    points = []
    if spec.kind == "pass_fail":
        points.append("All or nothing: award either 0 or the full marks.")
    for c in spec.criteria:
        line = f"[{c.id}] {c.description} ({c.points:g} pts)"
        if c.expected_answer:
            line += f". Expected: {c.expected_answer}"
        if c.notes:
            line += f". Notes: {c.notes}"
        points.append(line)
    if spec.grading_notes:
        points.append(f"General: {spec.grading_notes}")
    return RubricCriteria(question_id=label, expected_points=points)


def _rubric_problem(label: str, question: DBQuestion, record: Optional[RubricSpecRecord]) -> Optional[str]:
    if record is None:
        return f"{label}: the rubric could not be parsed ({question.rubric_error or 'unknown error'})"
    if record.status != RubricStatus.READY:
        return f"{label}: {' '.join(record.validation_errors)}"
    return None


def _to_grader_question(label: str, q: DBQuestion) -> GraderQuestion:
    return GraderQuestion(
        id=label,
        text=q.question_text,
        max_score=q.max_score,
        question_type=GraderQuestionType(q.question_type.value),
    )


def _set_progress(db: Session, submission: Submission, step: str, **fields) -> None:
    crud.submission.update(db, db_obj=submission, obj_in={"current_step": step, **fields})


async def run_grading(run_id: UUID) -> None:
    """
    Execute one grading run (the unit of audit): grade its submission against the exam's
    questions, recording every model call in `llm_calls` and the outcome on the run.

    Steps: OCR the answer sheet -> pair answers with questions + rubrics -> grade each
    pair with the agent graph -> save per-question results and totals.
    Idempotent per run: a redelivered task for a finished run does nothing.
    """
    llm_settings = get_llm_settings()
    with Session(engine) as db:
        run = db.get(GradingRun, run_id)
        if run is None:
            logger.error("grading_run_not_found", run_id=str(run_id))
            return
        if run.status in RunStatus.TERMINAL:
            logger.info("grading_run_already_finished", run_id=str(run_id), status=run.status)
            return
        submission = crud.submission.get(db, id=run.submission_id)
        if not submission:
            finish_run(db, run, error="Submission not found")
            return

        start_run(db, run)
        error: Optional[str] = None
        try:
            question_count = len(crud.question.get_by_exam(db, exam_id=submission.exam_id))
            # One router, one call/cost budget and one audit recorder per grading run
            with run_trace(run.id, submission.id, run.trigger) as trace_id, run_router(), budget(
                llm_settings.max_calls_for(question_count), llm_settings.max_cost_usd_per_submission
            ), recording_to(DbCallRecorder(run.id, submission.id)) as recorder:
                set_trace_id(db, run, trace_id)
                await _grade(db, submission, recorder)
        except Exception as e:
            error = str(e)
            logger.exception("pipeline_error", run_id=str(run_id), submission_id=str(submission.id), error=error)
            # A failed flush/commit leaves the session unusable until rolled back
            db.rollback()
            try:
                submission = crud.submission.get(db, id=run.submission_id)
                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={
                        "status": SubmissionStatus.FAILED,
                        "current_step": f"Error: {error[:400]}",
                    },
                )
            except Exception:
                logger.exception("failed_to_update_submission_status", submission_id=str(run.submission_id))

        db.refresh(run)
        finish_run(db, run, error=error)


async def _grade(db: Session, submission: Submission, recorder: DbCallRecorder) -> None:
    submission_id = str(submission.id)
    _set_progress(db, submission, "Loading questions...", status=SubmissionStatus.PROCESSING)

    # Ordered, non-deleted questions (exam.questions includes soft-deleted rows)
    db_questions = crud.question.get_by_exam(db, exam_id=submission.exam_id)
    if not db_questions:
        raise ValueError("This exam has no questions configured.")

    labels = exam_labels(db_questions)
    db_question_by_label = dict(zip(labels, db_questions))
    questions = [_to_grader_question(label, q) for label, q in db_question_by_label.items()]

    # ===== Step 0: Rubric specs (parsed now if missing; never grade against an unchecked one) =====
    _set_progress(db, submission, "Checking rubrics...")
    specs = await ensure_rubric_specs(db, db_questions, recorder)
    problems = [
        p for p in (_rubric_problem(label, q, specs.get(q.id)) for label, q in db_question_by_label.items()) if p
    ]
    if problems:
        raise RubricNotReady(
            "Rubric needs attention before grading. " + " | ".join(problems)
            + " Fix the rubric spec (or re-parse it), then regrade."
        )
    rubrics = [
        criteria_for_grader(label, RubricSpec.model_validate(specs[q.id].spec))
        for label, q in db_question_by_label.items()
    ]

    # ===== Step 1: Pages (every uploaded file -> upright page images + typed text) =====
    _set_progress(db, submission, "Preparing answer pages...")
    try:
        db_pages = submission_pages(db, submission)
    except DocumentError as e:
        raise ValueError(f"The answer sheet can't be read: {e}") from e
    pages = [
        SheetPage(number=i, image_path=Path(p.image_path) if p.image_path else None, text_layer=p.text_layer)
        for i, p in enumerate(db_pages, start=1)
    ]

    # ===== Step 2: OCR =====
    logger.info("pipeline_step", step="ocr", submission_id=submission_id, pages=len(pages))
    _set_progress(db, submission, f"Reading {len(pages)} page(s) for {len(questions)} questions...")
    answers: list[Answer] = await get_ocr_service().extract_answers(
        pages, questions, context=CallContext(purpose="ocr_answers", submission_id=submission.id)
    )
    if not answers:
        # The model read the sheet but matched nothing; grading would award all zeros.
        raise ValueError(
            "No answers could be matched to the exam's questions. "
            "Check that the uploaded file is this exam's answer sheet."
        )

    # ===== Step 3: Triplet Formation =====
    logger.info("pipeline_step", step="triplets", submission_id=submission_id)
    triplets = get_triplet_service().form_triplets(questions, answers, rubrics)
    answer_text_by_label = {t.question_id: t.candidate_answer for t in triplets}
    _set_progress(db, submission, f"Matched {len(answers)} answers. Starting grading...")

    # ===== Step 4: Agent Grading =====
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

    # ===== Step 5: Save results (one transaction) =====
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
