"""Main grading pipeline service."""

import json
from pathlib import Path
from typing import Optional
from uuid import UUID

import structlog
from sqlmodel import Session

from app.core.db import engine
from app import crud
from app.schemas.grading import ProcessingStatus, Answer, GradingResult, Triplet
from app.models.org import Enrollment
from app.models.exam import SubmissionStatus, Question
from .ocr_service import get_ocr_service
from .triplet_service import get_triplet_service
from app.agents.orchestrator import get_orchestrator

logger = structlog.get_logger(__name__)


def is_combined_document(questions_path: str, answers_path: str) -> bool:
    """Check if this is a combined document upload."""
    # Combined if paths are the same and contain "combined" in the path
    if questions_path == answers_path:
        return "combined" in questions_path.lower()
    return False


async def run_grading_pipeline(
    submission_id: UUID,
    questions_path: str,
    answers_path: str,
    rubric_path: Optional[str] = None,
) -> None:
    """
    Run the complete grading pipeline using PostgreSQL.
    """
    with Session(engine) as db:
        try:
            # Fetch submission
            submission = crud.submission.get(db, id=submission_id)
            if not submission:
                logger.error("submission_not_found", submission_id=str(submission_id))
                return

            # ===== Step 1: OCR Processing =====
            logger.info("pipeline_step", step="ocr", submission_id=str(submission_id))
            crud.submission.update(
                db,
                db_obj=submission,
                obj_in={"status": "processing", "current_step": "Analyzing documents..."}
            )

            ocr_service = get_ocr_service()

            # Check if this is a combined document
            combined = is_combined_document(questions_path, answers_path)

            if combined:
                # Combined document: extract both questions and answers together
                logger.info(
                    "combined_document_detected",
                    submission_id=str(submission_id),
                    path=questions_path
                )

                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={"current_step": "Extracting Q&A from combined document..."}
                )

                questions, answers = await ocr_service.extract_questions_and_answers(
                    Path(questions_path)
                )

                if not questions:
                    raise ValueError(
                        "Failed to extract questions from combined document. "
                        "Make sure the document contains visible question text."
                    )

                if not answers:
                    logger.warning(
                        "no_answers_in_combined",
                        submission_id=str(submission_id),
                        question_count=len(questions)
                    )
                    # Create placeholder answers for unanswered questions
                    answers = [
                        Answer(
                            question_id=q.id,
                            text="No answer provided",
                            confidence=0.0
                        )
                        for q in questions
                    ]

                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={"current_step": f"Extracted {len(questions)} questions and {len(answers)} answers"}
                )

            else:
                # Separate documents: extract questions first, then answers
                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={"current_step": "Extracting text from question paper..."}
                )

                # Extract questions
                questions = await ocr_service.extract_questions(Path(questions_path))
                if not questions:
                    raise ValueError(
                        "Failed to extract questions from document. "
                        "Make sure the question paper contains visible question text."
                    )

                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={"current_step": f"Extracted {len(questions)} questions. Processing answers..."}
                )

                # Extract answers
                answers = await ocr_service.extract_answers(Path(answers_path), questions)
                if not answers:
                    logger.warning(
                        "no_answers_extracted",
                        submission_id=str(submission_id),
                        question_count=len(questions)
                    )
                    # Create placeholder answers
                    answers = [
                        Answer(
                            question_id=q.id,
                            text="No answer provided",
                            confidence=0.0
                        )
                        for q in questions
                    ]

                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={"current_step": f"Extracted {len(answers)} answers. Processing rubric..."}
                )

            # Extract rubric if provided (In new flow, we might fetch it from DB later)
            rubric_criteria = []
            if rubric_path:
                logger.info(
                    "rubric_extraction_starting",
                    submission_id=str(submission_id),
                    rubric_path=rubric_path,
                    rubric_path_exists=Path(rubric_path).exists()
                )
                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={"current_step": "Extracting rubric criteria..."}
                )
                rubric_criteria = await ocr_service.extract_rubric(Path(rubric_path))
                logger.info(
                    "rubric_extracted",
                    submission_id=str(submission_id),
                    criteria_count=len(rubric_criteria),
                    rubric_path=rubric_path
                )
            else:
                logger.info(
                    "no_rubric_path_provided",
                    submission_id=str(submission_id)
                )

            # ===== Step 2: Triplet Formation =====
            logger.info("pipeline_step", step="triplets", submission_id=str(submission_id))
            crud.submission.update(
                db,
                db_obj=submission,
                obj_in={"current_step": "Forming question-answer-rubric triplets"}
            )

            triplet_service = get_triplet_service()
            triplets = triplet_service.form_triplets(questions, answers, rubric_criteria)

            if not triplets:
                raise ValueError(
                    "Failed to form triplets. Match check failed."
                )

            crud.submission.update(
                db,
                db_obj=submission,
                obj_in={"current_step": f"Formed {len(triplets)} triplets. Starting grading..."}
            )

            # ===== Step 3: Agent Grading =====
            logger.info("pipeline_step", step="grading", submission_id=str(submission_id))

            orchestrator = get_orchestrator()
            results: list[GradingResult] = []

            for i, triplet in enumerate(triplets):
                crud.submission.update(
                    db,
                    db_obj=submission,
                    obj_in={"current_step": f"Grading question {triplet.question_id} ({i + 1}/{len(triplets)})"}
                )

                result = await orchestrator.grade_triplet(triplet)
                results.append(result)

                logger.info(
                    "question_graded",
                    submission_id=str(submission_id),
                    question_id=triplet.question_id,
                    score=result.score,
                    max_score=result.max_score,
                    grader=result.grader
                )

            # ===== Step 4: Save Results to PostgreSQL =====
            logger.info("pipeline_step", step="save_results", submission_id=str(submission_id))

            total_score = sum(r.score for r in results)
            max_total_score = sum(r.max_score for r in results)
            percentage = (total_score / max_total_score * 100) if max_total_score > 0 else 0

            # Clear existing answers if any (to make it idempotent)
            existing_answers = crud.submission_answer.get_by_submission(db, submission_id=submission_id)
            for old_ans in existing_answers:
                db.delete(old_ans)
            db.commit() # Commit deletions before adding new ones

            # Map Question IDs to DB Question UUIDs
            # For MVP, we'll try to match by order_index or partial name
            db_questions = crud.question.get_by_exam(db, exam_id=submission.exam_id)
            q_map = {q.order_index: q.id for q in db_questions}
            # Fallback map by ID string if possible
            if not q_map:
                q_map = {str(i+1): q.id for i, q in enumerate(db_questions)}

            for i, res in enumerate(results):
                # Try to find corresponding DB question
                q_id = q_map.get(i + 1) or q_map.get(str(i+1))
                if not q_id and db_questions:
                    q_id = db_questions[min(i, len(db_questions)-1)].id

                crud.submission_answer.create(
                    db,
                    obj_in={
                        "submission_id": submission_id,
                        "question_id": q_id,
                        "student_answer_text": res.question_id, # Simplified for now
                        "score": res.score,
                        "feedback": res.feedback,
                        "reasoning": res.reasoning
                    }
                )

            # Update final submission status
            crud.submission.update(
                db,
                db_obj=submission,
                obj_in={
                    "status": "graded",
                    "total_score": total_score,
                    "max_score": max_total_score,
                    "percentage": percentage,
                    "current_step": "Grading complete"
                }
            )

            logger.info(
                "pipeline_complete",
                submission_id=str(submission_id),
                score=f"{total_score}/{max_total_score}"
            )

        except Exception as e:
            logger.exception("pipeline_error", submission_id=str(submission_id), error=str(e))
            crud.submission.update(
                db,
                db_obj=submission,
                obj_in={
                    "status": "failed",
                    "current_step": f"Error: {str(e)}"
                }
            )
