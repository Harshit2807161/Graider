"""Main grading pipeline service."""

import json
from pathlib import Path
from typing import Optional
from uuid import UUID

import structlog

from ..config import get_settings
from ..models.database import get_database
from ..models.schemas import GradingResult, ProcessingStatus, Triplet
from .ocr_service import get_ocr_service
from .triplet_service import get_triplet_service
from ..agents.orchestrator import get_orchestrator

logger = structlog.get_logger(__name__)


def is_combined_document(questions_path: str, answers_path: str) -> bool:
    """Check if this is a combined document upload."""
    # Combined if paths are the same and contain "combined" in the path
    if questions_path == answers_path:
        return "combined" in questions_path.lower()
    return False


async def run_grading_pipeline(
    session_id: UUID,
    questions_path: str,
    answers_path: str,
    rubric_path: Optional[str] = None,
) -> None:
    """
    Run the complete grading pipeline.

    Steps:
    1. OCR extraction from images/PDFs
    2. Triplet formation
    3. Agent orchestration for grading
    4. Results aggregation

    Handles:
    - Separate question and answer documents
    - Combined documents with both questions and answers
    - PDF and image inputs
    - Mixed handwritten and printed text

    Args:
        session_id: The grading session ID
        questions_path: Path to questions directory
        answers_path: Path to answers directory
        rubric_path: Optional path to rubric directory
    """
    db = get_database()
    settings = get_settings()

    try:
        # ===== Step 1: OCR Processing =====
        logger.info("pipeline_step", step="ocr", session_id=str(session_id))
        db.update_session(
            session_id=session_id,
            status=ProcessingStatus.OCR_PROCESSING,
            progress=10.0,
            current_step="Analyzing documents..."
        )

        ocr_service = get_ocr_service()

        # Check if this is a combined document
        combined = is_combined_document(questions_path, answers_path)

        if combined:
            # Combined document: extract both questions and answers together
            logger.info(
                "combined_document_detected",
                session_id=str(session_id),
                path=questions_path
            )

            db.update_session(
                session_id=session_id,
                progress=15.0,
                current_step="Extracting questions and answers from combined document..."
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
                    session_id=str(session_id),
                    question_count=len(questions)
                )
                # Create placeholder answers for unanswered questions
                from ..models.schemas import Answer
                answers = [
                    Answer(
                        question_id=q.id,
                        text="No answer provided",
                        confidence=0.0
                    )
                    for q in questions
                ]

            db.update_session(
                session_id=session_id,
                progress=40.0,
                current_step=f"Extracted {len(questions)} questions and {len(answers)} answers"
            )

        else:
            # Separate documents: extract questions first, then answers
            db.update_session(
                session_id=session_id,
                progress=10.0,
                current_step="Extracting text from question paper..."
            )

            # Extract questions
            questions = await ocr_service.extract_questions(Path(questions_path))
            if not questions:
                raise ValueError(
                    "Failed to extract questions from document. "
                    "Make sure the question paper contains visible question text."
                )

            db.update_session(
                session_id=session_id,
                progress=25.0,
                current_step=f"Extracted {len(questions)} questions. Processing answers..."
            )

            # Extract answers
            answers = await ocr_service.extract_answers(Path(answers_path), questions)
            if not answers:
                logger.warning(
                    "no_answers_extracted",
                    session_id=str(session_id),
                    question_count=len(questions)
                )
                # Create placeholder answers
                from ..models.schemas import Answer
                answers = [
                    Answer(
                        question_id=q.id,
                        text="No answer provided",
                        confidence=0.0
                    )
                    for q in questions
                ]

            db.update_session(
                session_id=session_id,
                progress=40.0,
                current_step=f"Extracted {len(answers)} answers. Processing rubric..."
            )

        # Extract rubric if provided
        rubric_criteria = []
        if rubric_path:
            logger.info(
                "rubric_extraction_starting",
                session_id=str(session_id),
                rubric_path=rubric_path,
                rubric_path_exists=Path(rubric_path).exists()
            )
            db.update_session(
                session_id=session_id,
                progress=45.0,
                current_step="Extracting rubric criteria..."
            )
            rubric_criteria = await ocr_service.extract_rubric(Path(rubric_path))
            logger.info(
                "rubric_extracted",
                session_id=str(session_id),
                criteria_count=len(rubric_criteria),
                rubric_path=rubric_path
            )
        else:
            logger.info(
                "no_rubric_path_provided",
                session_id=str(session_id)
            )

        # Save OCR outputs
        output_dir = settings.output_dir / str(session_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        with open(output_dir / "questions.json", "w") as f:
            json.dump([q.model_dump() for q in questions], f, indent=2, default=str)

        with open(output_dir / "answers.json", "w") as f:
            json.dump([a.model_dump() for a in answers], f, indent=2)

        if rubric_criteria:
            with open(output_dir / "rubric.json", "w") as f:
                json.dump([r.model_dump() for r in rubric_criteria], f, indent=2)

        # ===== Step 2: Triplet Formation =====
        logger.info("pipeline_step", step="triplets", session_id=str(session_id))
        db.update_session(
            session_id=session_id,
            status=ProcessingStatus.TRIPLET_FORMING,
            progress=50.0,
            current_step="Forming question-answer-rubric triplets"
        )

        triplet_service = get_triplet_service()
        triplets = triplet_service.form_triplets(questions, answers, rubric_criteria)

        if not triplets:
            raise ValueError(
                "Failed to form triplets. This may happen if questions and answers "
                "could not be matched. Check the extracted questions.json and answers.json."
            )

        # Save triplets
        triplet_service.save_triplets(triplets, output_dir / "triplets.json")

        db.update_session(
            session_id=session_id,
            triplets_json=json.dumps([t.model_dump() for t in triplets], default=str),
            progress=55.0,
            current_step=f"Formed {len(triplets)} triplets. Starting grading..."
        )

        # ===== Step 3: Agent Grading =====
        logger.info("pipeline_step", step="grading", session_id=str(session_id))
        db.update_session(
            session_id=session_id,
            status=ProcessingStatus.GRADING,
            progress=60.0,
            current_step="Grading in progress"
        )

        orchestrator = get_orchestrator()
        results: list[GradingResult] = []

        for i, triplet in enumerate(triplets):
            progress = 60.0 + (35.0 * (i + 1) / len(triplets))
            db.update_session(
                session_id=session_id,
                progress=progress,
                current_step=f"Grading question {triplet.question_id} ({i + 1}/{len(triplets)})"
            )

            result = await orchestrator.grade_triplet(triplet)
            results.append(result)

            logger.info(
                "question_graded",
                session_id=str(session_id),
                question_id=triplet.question_id,
                score=result.score,
                max_score=result.max_score,
                grader=result.grader
            )

        # ===== Step 4: Aggregate Results =====
        logger.info("pipeline_step", step="aggregation", session_id=str(session_id))

        total_score = sum(r.score for r in results)
        max_total_score = sum(r.max_score for r in results)
        overall_percentage = (total_score / max_total_score * 100) if max_total_score > 0 else 0

        # Generate summary based on performance
        if overall_percentage >= 90:
            performance = "Excellent performance"
        elif overall_percentage >= 75:
            performance = "Good performance"
        elif overall_percentage >= 60:
            performance = "Satisfactory performance"
        elif overall_percentage >= 40:
            performance = "Needs improvement"
        else:
            performance = "Significant improvement needed"

        summary = (
            f"{performance}. Graded {len(results)} questions. "
            f"Total: {total_score:.1f}/{max_total_score:.1f} ({overall_percentage:.1f}%)"
        )

        # Save results
        with open(output_dir / "results.json", "w") as f:
            json.dump([r.model_dump() for r in results], f, indent=2)

        # Save summary
        with open(output_dir / "summary.json", "w") as f:
            json.dump({
                "total_score": total_score,
                "max_total_score": max_total_score,
                "overall_percentage": overall_percentage,
                "question_count": len(results),
                "summary": summary
            }, f, indent=2)

        # Update database with final results
        db.save_results(
            session_id=session_id,
            results=results,
            total_score=total_score,
            max_total_score=max_total_score,
            summary=summary
        )

        logger.info(
            "pipeline_complete",
            session_id=str(session_id),
            total_score=total_score,
            max_total_score=max_total_score,
            question_count=len(results),
            overall_percentage=overall_percentage
        )

    except Exception as e:
        logger.exception(
            "pipeline_error",
            session_id=str(session_id),
            error=str(e)
        )
        db.update_session(
            session_id=session_id,
            status=ProcessingStatus.FAILED,
            error_message=str(e),
            current_step="Pipeline failed"
        )
        # Don't re-raise - this is a background task, error is recorded in DB
