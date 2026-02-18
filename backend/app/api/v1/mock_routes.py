"""
TEMPORARY MOCK FILE -- remove when real endpoints are built.

Provides mock endpoints under /api/v1/mock/ for Flutter app development.
All data is in-memory and resets on server restart.

Endpoints:
  POST /grade              - Start mock grading session
  GET  /status/{session_id} - Get mock session status (time-based transitions)
  GET  /results/{session_id} - Get mock grading results (5 questions)
  POST /ocr/cover-page     - Return random student identity
  GET  /batches/{batch_id}/members - Return mock student list
"""

import random
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.grading import (
    GradeResponse,
    GradingResult,
    ProcessingStatus,
    ResultsResponse,
    StatusResponse,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------

_mock_sessions: dict[str, dict] = {}

MOCK_DELAY_SECONDS = 8  # Total time for status to transition to "completed"

# ---------------------------------------------------------------------------
# Mock student data
# ---------------------------------------------------------------------------

_MOCK_STUDENTS = [
    {"student_name": "Aarav Sharma", "roll_number": "CS2024-042"},
    {"student_name": "Priya Patel", "roll_number": "CS2024-017"},
    {"student_name": "Rohan Gupta", "roll_number": "CS2024-089"},
    {"student_name": "Ananya Singh", "roll_number": "CS2024-033"},
    {"student_name": "Vikram Reddy", "roll_number": "CS2024-056"},
    {"student_name": "Neha Joshi", "roll_number": "CS2024-071"},
    {"student_name": "Arjun Mehta", "roll_number": "CS2024-024"},
    {"student_name": "Kavya Nair", "roll_number": "CS2024-098"},
]

# ---------------------------------------------------------------------------
# Mock grading results (static, returned for every session)
# ---------------------------------------------------------------------------

_MOCK_RESULTS: list[GradingResult] = [
    GradingResult(
        question_id="Q1",
        score=8.5,
        max_score=10.0,
        reasoning=(
            "The student demonstrated strong understanding of quadratic equations. "
            "The factoring approach was correct, though one sign error in step 3 "
            "led to a minor deduction."
        ),
        feedback=(
            "Excellent work on the factoring method. Double-check your signs "
            "when expanding brackets to avoid small errors."
        ),
        grader="math",
        confidence=0.92,
    ),
    GradingResult(
        question_id="Q2",
        score=7.0,
        max_score=10.0,
        reasoning=(
            "The essay addresses the main themes of the passage but lacks "
            "supporting evidence from the text. The thesis statement is clear "
            "but the body paragraphs need more development."
        ),
        feedback=(
            "Your thesis is well-formed. To improve, include direct quotes "
            "from the passage to support each claim you make."
        ),
        grader="english",
        confidence=0.88,
    ),
    GradingResult(
        question_id="Q3",
        score=9.0,
        max_score=10.0,
        reasoning=(
            "The student correctly identified the chemical equation, balanced "
            "it properly, and explained the reaction mechanism. Minor deduction "
            "for not mentioning the catalyst."
        ),
        feedback=(
            "Outstanding understanding of chemical reactions. Remember to "
            "mention any catalysts involved in the reaction."
        ),
        grader="science",
        confidence=0.95,
    ),
    GradingResult(
        question_id="Q4",
        score=6.0,
        max_score=10.0,
        reasoning=(
            "The historical analysis covers the main events but misses the "
            "socioeconomic factors that contributed to the outcome. The "
            "chronological ordering is correct."
        ),
        feedback=(
            "Good recall of key events. Consider analyzing the broader social "
            "and economic context to strengthen your historical arguments."
        ),
        grader="history",
        confidence=0.85,
    ),
    GradingResult(
        question_id="Q5",
        score=5.0,
        max_score=10.0,
        reasoning=(
            "The student attempted the integration problem but used the wrong "
            "technique. Substitution was needed but the student applied "
            "integration by parts, leading to an incorrect result."
        ),
        feedback=(
            "Review when to use u-substitution vs. integration by parts. "
            "Look for composite functions as a clue for substitution."
        ),
        grader="math",
        confidence=0.90,
    ),
]

# Pre-compute totals
_MOCK_TOTAL_SCORE = sum(r.score for r in _MOCK_RESULTS)
_MOCK_MAX_TOTAL = sum(r.max_score for r in _MOCK_RESULTS)
_MOCK_OVERALL_PCT = round((_MOCK_TOTAL_SCORE / _MOCK_MAX_TOTAL) * 100, 1)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/grade", response_model=GradeResponse)
async def mock_grade(request: dict | None = None):
    """Accept a grading request and return a session_id.

    Status transitions automatically based on elapsed time when polled
    via the /status endpoint.
    """
    session_id = uuid4()
    _mock_sessions[str(session_id)] = {
        "created_at": datetime.now(timezone.utc),
    }
    return GradeResponse(
        session_id=session_id,
        status=ProcessingStatus.OCR_PROCESSING,
        message=(
            "Mock grading pipeline started. "
            "Poll /api/v1/mock/status/{session_id} for progress."
        ),
    )


@router.get("/status/{session_id}", response_model=StatusResponse)
async def mock_status(session_id: str):
    """Return session status based on elapsed time since creation.

    Transitions:
      < 33% delay  -> ocr_processing (25% progress)
      < 66% delay  -> grading (60% progress)
      >= 66% delay -> completed (100% progress)
    """
    session = _mock_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    elapsed = (datetime.now(timezone.utc) - session["created_at"]).total_seconds()

    if elapsed < MOCK_DELAY_SECONDS * 0.33:
        return StatusResponse(
            session_id=UUID(session_id),
            status=ProcessingStatus.OCR_PROCESSING,
            progress=25.0,
            current_step="Extracting text from images",
        )
    elif elapsed < MOCK_DELAY_SECONDS * 0.66:
        return StatusResponse(
            session_id=UUID(session_id),
            status=ProcessingStatus.GRADING,
            progress=60.0,
            current_step="AI agents grading answers",
        )
    else:
        return StatusResponse(
            session_id=UUID(session_id),
            status=ProcessingStatus.COMPLETED,
            progress=100.0,
            current_step="Grading complete",
        )


@router.get("/results/{session_id}", response_model=ResultsResponse)
async def mock_results(session_id: str):
    """Return realistic per-question grading results.

    Returns 5 questions spanning math, english, science, and history
    with AI-style reasoning and constructive feedback.
    """
    session = _mock_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return ResultsResponse(
        session_id=UUID(session_id),
        status=ProcessingStatus.COMPLETED,
        results=_MOCK_RESULTS,
        total_score=_MOCK_TOTAL_SCORE,
        max_total_score=_MOCK_MAX_TOTAL,
        overall_percentage=_MOCK_OVERALL_PCT,
        summary=(
            f"Student scored {_MOCK_TOTAL_SCORE}/{_MOCK_MAX_TOTAL} "
            f"({_MOCK_OVERALL_PCT}%). Strengths in science and math "
            "fundamentals. Areas for improvement: essay development "
            "and advanced calculus techniques."
        ),
        completed_at=datetime.now(timezone.utc),
    )


@router.post("/ocr/cover-page")
async def mock_ocr_cover_page(file: UploadFile = File(...)):
    """Return a random student identity. Ignores the uploaded file content."""
    student = random.choice(_MOCK_STUDENTS)
    return {
        "student_name": student["student_name"],
        "roll_number": student["roll_number"],
        "confidence": round(random.uniform(0.80, 0.95), 2),
    }


@router.get("/batches/{batch_id}/members")
async def mock_batch_members(batch_id: str):
    """Return a fixed list of mock students for any batch.

    Response shape matches what StudentDto.fromJson expects in the Flutter app.
    """
    members = [
        {
            "id": str(uuid4()),
            "full_name": s["student_name"],
            "roll_number": s["roll_number"],
            "profile_data": {"roll_number": s["roll_number"]},
        }
        for s in _MOCK_STUDENTS[:5]
    ]
    return members
