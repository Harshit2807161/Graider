"""Grading trigger endpoint for Gr8r."""

import asyncio
from uuid import UUID

import structlog
from fastapi import APIRouter, BackgroundTasks, HTTPException

from ...models.database import get_database
from ...models.schemas import GradeRequest, GradeResponse, ProcessingStatus
from ...services.grading_service import run_grading_pipeline

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("/grade", response_model=GradeResponse)
async def trigger_grading(
    request: GradeRequest,
    background_tasks: BackgroundTasks,
):
    """
    Trigger the grading pipeline for a session.

    This endpoint validates that all required files are uploaded,
    then starts the grading process in the background.
    """
    db = get_database()
    session = db.get_session(request.session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if all required files are uploaded
    if not session.get("questions_path"):
        raise HTTPException(
            status_code=400,
            detail="Question paper images not uploaded"
        )
    if not session.get("answers_path"):
        raise HTTPException(
            status_code=400,
            detail="Answer sheet images not uploaded"
        )
    # Rubric is optional but recommended
    if not session.get("rubric_path"):
        logger.warning(
            "grading_without_rubric",
            session_id=str(request.session_id),
            message="Grading without rubric - may affect accuracy"
        )

    # Check if already processing or completed
    current_status = ProcessingStatus(session["status"])
    if current_status in [ProcessingStatus.GRADING, ProcessingStatus.OCR_PROCESSING]:
        raise HTTPException(
            status_code=400,
            detail=f"Session is already being processed: {current_status.value}"
        )
    if current_status == ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Session has already been graded. Create a new session to grade again."
        )

    # Update status and start grading in background
    db.update_session(
        session_id=request.session_id,
        status=ProcessingStatus.OCR_PROCESSING,
        progress=0.0,
        current_step="Starting OCR processing"
    )

    # Run grading pipeline in background
    background_tasks.add_task(
        run_grading_pipeline,
        session_id=request.session_id,
        questions_path=session["questions_path"],
        answers_path=session["answers_path"],
        rubric_path=session.get("rubric_path"),
    )

    logger.info(
        "grading_started",
        session_id=str(request.session_id)
    )

    return GradeResponse(
        session_id=request.session_id,
        status=ProcessingStatus.OCR_PROCESSING,
        message="Grading pipeline started. Poll /api/status/{session_id} for progress."
    )
