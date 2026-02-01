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


async def run_grading_pipeline(
    session_id: UUID,
    questions_path: str,
    answers_path: str,
    rubric_path: Optional[str] = None,
) -> None:
    """
    Run the complete grading pipeline.

    Steps:
    1. OCR extraction from images
    2. Triplet formation
    3. Agent orchestration for grading
    4. Results aggregation

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
            current_step="Extracting text from question paper"
        )

        ocr_service = get_ocr_service()

        # Extract questions
        questions = await ocr_service.extract_questions(Path(questions_path))
        if not questions:
            raise ValueError("Failed to extract questions from images")

        db.update_session(
            session_id=session_id,
            progress=25.0,
            current_step=f"Extracted {len(questions)} questions. Processing answers..."
        )

        # Extract answers
        answers = await ocr_service.extract_answers(Path(answers_path), questions)
        if not answers:
            raise ValueError("Failed to extract answers from images")

        db.update_session(
            session_id=session_id,
            progress=40.0,
            current_step=f"Extracted {len(answers)} answers. Processing rubric..."
        )

        # Extract rubric if provided
        rubric_criteria = []
        if rubric_path:
            rubric_criteria = await ocr_service.extract_rubric(Path(rubric_path))

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
            raise ValueError("Failed to form triplets")

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
                max_score=result.max_score
            )

        # ===== Step 4: Aggregate Results =====
        logger.info("pipeline_step", step="aggregation", session_id=str(session_id))

        total_score = sum(r.score for r in results)
        max_total_score = sum(r.max_score for r in results)
        overall_percentage = (total_score / max_total_score * 100) if max_total_score > 0 else 0

        summary = (
            f"Graded {len(results)} questions. "
            f"Total: {total_score:.1f}/{max_total_score:.1f} ({overall_percentage:.1f}%)"
        )

        # Save results
        with open(output_dir / "results.json", "w") as f:
            json.dump([r.model_dump() for r in results], f, indent=2)

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
            question_count=len(results)
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
        raise
