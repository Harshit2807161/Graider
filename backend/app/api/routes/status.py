"""Status check endpoint for Gr8r."""

from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException

from ...models.database import get_database
from ...models.schemas import ProcessingStatus, StatusResponse

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/status/{session_id}", response_model=StatusResponse)
async def get_status(session_id: UUID):
    """
    Get the current status of a grading session.

    Returns the processing status, progress percentage, and current step.
    """
    db = get_database()
    session = db.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    logger.debug(
        "status_check",
        session_id=str(session_id),
        status=session["status"]
    )

    return StatusResponse(
        session_id=session_id,
        status=ProcessingStatus(session["status"]),
        progress=session.get("progress", 0.0),
        current_step=session.get("current_step"),
        error_message=session.get("error_message"),
    )
