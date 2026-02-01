"""Results retrieval endpoint for Gr8r."""

import json
from datetime import datetime
from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException

from ...models.database import get_database
from ...models.schemas import GradingResult, ProcessingStatus, ResultsResponse

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/results/{session_id}", response_model=ResultsResponse)
async def get_results(session_id: UUID):
    """
    Get the grading results for a completed session.

    Returns detailed results for each question including scores,
    reasoning, and feedback.
    """
    db = get_database()
    session = db.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    status = ProcessingStatus(session["status"])

    # If not completed, return current status
    if status != ProcessingStatus.COMPLETED:
        if status == ProcessingStatus.FAILED:
            raise HTTPException(
                status_code=400,
                detail=f"Grading failed: {session.get('error_message', 'Unknown error')}"
            )
        return ResultsResponse(
            session_id=session_id,
            status=status,
            results=[],
            total_score=0.0,
            max_total_score=0.0,
            overall_percentage=0.0,
            summary=f"Grading in progress: {session.get('current_step', status.value)}",
        )

    # Parse results
    results = []
    if session.get("results_json"):
        results_data = json.loads(session["results_json"])
        results = [GradingResult(**r) for r in results_data]

    total_score = session.get("total_score", 0.0)
    max_total_score = session.get("max_total_score", 0.0)
    overall_percentage = (
        round((total_score / max_total_score) * 100, 1)
        if max_total_score > 0 else 0.0
    )

    completed_at = None
    if session.get("completed_at"):
        completed_at = datetime.fromisoformat(session["completed_at"])

    logger.info(
        "results_retrieved",
        session_id=str(session_id),
        total_score=total_score,
        max_score=max_total_score
    )

    return ResultsResponse(
        session_id=session_id,
        status=status,
        results=results,
        total_score=total_score,
        max_total_score=max_total_score,
        overall_percentage=overall_percentage,
        summary=session.get("summary"),
        completed_at=completed_at,
    )
