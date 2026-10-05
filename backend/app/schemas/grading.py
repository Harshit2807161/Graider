"""Pydantic schemas for Gr8r API."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ===== Enums =====

class QuestionType(str, Enum):
    """Types of questions supported."""
    DESCRIPTIVE = "descriptive"
    PROBLEM = "problem"
    MCQ = "mcq"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"


class Subject(str, Enum):
    """Subject categories for routing to graders."""
    MATH = "math"
    ENGLISH = "english"
    SCIENCE = "science"
    HISTORY = "history"
    GENERAL = "general"


class ProcessingStatus(str, Enum):
    """Status of a grading session."""
    PENDING = "pending"
    UPLOADING = "uploading"
    OCR_PROCESSING = "ocr_processing"
    TRIPLET_FORMING = "triplet_forming"
    GRADING = "grading"
    COMPLETED = "completed"
    FAILED = "failed"


# ===== OCR Output Models =====

class Question(BaseModel):
    """Extracted question from question paper."""
    id: str = Field(..., description="Question identifier (e.g., Q1, Q2a)")
    text: str = Field(..., description="Full question text")
    max_score: float = Field(..., description="Maximum possible score")
    question_type: QuestionType = Field(default=QuestionType.DESCRIPTIVE)
    subject: Optional[Subject] = Field(default=None, description="Detected subject")


class Answer(BaseModel):
    """Extracted answer from student answer sheet."""
    question_id: str = Field(..., description="Matching question ID")
    text: str = Field(..., description="Student's answer text")
    confidence: float = Field(default=1.0, description="OCR confidence score")


class RubricCriteria(BaseModel):
    """Grading criteria for a question."""
    question_id: str
    expected_points: list[str] = Field(default_factory=list, description="Key points expected")
    sample_answer: Optional[str] = Field(default=None, description="Model answer")
    scoring_guide: dict[str, float] = Field(
        default_factory=lambda: {"full": 1.0, "partial": 0.5, "minimal": 0.2}
    )


# ===== Triplet Model =====

class Triplet(BaseModel):
    """Combined question-answer-rubric for grading."""
    question_id: str
    question_text: str
    question_type: QuestionType
    subject: Subject
    candidate_answer: str
    expected_answer: Optional[RubricCriteria] = None
    max_score: float


# ===== Grading Result Models =====

class GradingResult(BaseModel):
    """Result from grading a single triplet."""
    question_id: str
    score: float
    max_score: float
    percentage: float = Field(default=0.0)
    reasoning: str = Field(..., description="Grader's reasoning for the score")
    feedback: str = Field(..., description="Constructive feedback for student")
    grader: str = Field(..., description="Which grader agent evaluated this")
    confidence: float = Field(default=1.0, description="Grader confidence in score")

    def model_post_init(self, __context) -> None:
        """Calculate percentage after initialization."""
        if self.max_score > 0:
            self.percentage = round((self.score / self.max_score) * 100, 1)


# ===== Session Models =====

class SessionStatus(BaseModel):
    """Status of a grading session."""
    session_id: UUID
    status: ProcessingStatus
    progress: float = Field(default=0.0, description="Progress percentage 0-100")
    current_step: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ===== API Request/Response Models =====

class UploadResponse(BaseModel):
    """Response after file upload."""
    session_id: UUID
    file_type: str  # "questions", "answers", "rubric"
    file_count: int
    message: str


class GradeRequest(BaseModel):
    """Request to start grading."""
    session_id: UUID


class GradeResponse(BaseModel):
    """Response after initiating grading."""
    session_id: UUID
    status: ProcessingStatus
    message: str


class StatusResponse(BaseModel):
    """Response for status check."""
    session_id: UUID
    status: ProcessingStatus
    progress: float
    current_step: Optional[str] = None
    error_message: Optional[str] = None


class ResultsResponse(BaseModel):
    """Complete grading results."""
    session_id: UUID
    status: ProcessingStatus
    results: list[GradingResult] = Field(default_factory=list)
    total_score: float = 0.0
    max_total_score: float = 0.0
    overall_percentage: float = 0.0
    summary: Optional[str] = None
    completed_at: Optional[datetime] = None
