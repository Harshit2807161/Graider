from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel
from app.core.constants import ExamStatus, SubmissionStatus, QuestionType

# --- Question Schemas ---

class QuestionBase(BaseModel):
    question_text: str
    order_index: int
    max_score: float
    rubric_criteria: Optional[str] = None
    question_type: QuestionType = QuestionType.DESCRIPTIVE

class QuestionCreate(QuestionBase):
    pass


class QuestionSync(QuestionBase):
    """A question in a full-list sync. Existing questions carry their id; new ones omit it."""
    id: Optional[UUID] = None

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    order_index: Optional[int] = None
    max_score: Optional[float] = None
    rubric_criteria: Optional[str] = None
    question_type: Optional[QuestionType] = None

class QuestionRead(QuestionBase):
    id: UUID
    exam_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- Exam Schemas ---

class ExamBase(BaseModel):
    name: str
    description: Optional[str] = None
    org_id: UUID
    batch_id: Optional[UUID] = None
    status: ExamStatus = ExamStatus.DRAFT
    config: Dict[str, Any] = {}

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    batch_id: Optional[UUID] = None
    status: Optional[ExamStatus] = None
    config: Optional[Dict[str, Any]] = None

class ExamRead(ExamBase):
    id: UUID
    created_by_membership_id: UUID
    created_at: datetime
    updated_at: datetime
    question_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ExamWithQuestions(ExamRead):
    questions: List[QuestionRead] = []

# --- Submission Schemas ---

class SubmissionAnswerBase(BaseModel):
    question_id: UUID
    student_answer_text: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    reasoning: Optional[str] = None

class SubmissionAnswerRead(SubmissionAnswerBase):
    id: UUID
    submission_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    exam_id: UUID
    student_membership_id: Optional[UUID] = None
    original_file_url: str
    graded_file_url: Optional[str] = None
    total_score: Optional[float] = None
    max_score: Optional[float] = None
    percentage: Optional[float] = None
    status: SubmissionStatus = SubmissionStatus.PENDING

class SubmissionRead(SubmissionBase):
    current_step: Optional[str] = None
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SubmissionWithAnswers(SubmissionRead):
    answers: List[SubmissionAnswerRead] = []
