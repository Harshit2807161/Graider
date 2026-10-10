from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.core.constants import ExamStatus, SubmissionStatus, QuestionType

# --- Question Schemas ---

class QuestionBase(BaseModel):
    question_text: str
    order_index: int
    max_score: float
    rubric_criteria: Optional[str] = None
    question_type: QuestionType = QuestionType.DESCRIPTIVE
    label: Optional[str] = None  # e.g. "2(b)"; unique within the exam
    printed_label: Optional[str] = None
    choice_group: Optional[str] = None

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
    label: Optional[str] = None
    printed_label: Optional[str] = None
    choice_group: Optional[str] = None

class QuestionRead(QuestionBase):
    id: UUID
    exam_id: UUID
    created_at: datetime
    # Parsed rubric (details: GET /exams/{exam_id}/questions/{id}/rubric-spec)
    rubric_status: str = "missing"
    rubric_error: Optional[str] = None
    rubric_derived: Optional[bool] = None  # criteria were derived because there was no rubric text
    rubric_summary: Optional[str] = None  # e.g. "3 criteria (science)"

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
    status: Optional[str] = None  # graded / escalated / not_attempted
    escalation_reason: Optional[str] = None
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
    student_name: Optional[str] = None  # filled in where the endpoint looks it up (exam lists)
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SubmissionWithAnswers(SubmissionRead):
    answers: List[SubmissionAnswerRead] = []


class GradingSettings(BaseModel):
    """An exam's grading settings (stored in `exam.config`; the GRADING_* settings until changed)."""
    # An answer is final once grader and evaluator agree at least this much; below 0.5 the evaluator
    # would no longer be a check
    agreement_threshold: float = Field(ge=0.5, le=1.0)
    spot_check_rate: float = Field(ge=0.0, le=1.0)  # share of confident answers sent to review anyway
    choice_policy: Literal["best", "first"]  # which extra alternative of a choice group counts


class GradingSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    agreement_threshold: Optional[float] = Field(default=None, ge=0.5, le=1.0)
    spot_check_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    choice_policy: Optional[Literal["best", "first"]] = None


class StudentAnswerView(BaseModel):
    question_id: UUID
    label: str
    question_text: str
    score: Optional[float] = None
    max_score: float
    counted: bool = True  # False for an extra alternative of a choice question
    feedback: Optional[str] = None


class StudentSubmissionView(BaseModel):
    """What a student sees of their own published submission: scores and feedback, not the grading
    internals (transcripts, evaluator rounds, escalations, models)."""
    id: UUID
    exam_id: UUID
    exam_name: Optional[str] = None
    status: SubmissionStatus
    total_score: Optional[float] = None
    max_score: Optional[float] = None
    percentage: Optional[float] = None
    published_at: Optional[datetime] = None
    pages: int = 0  # page images the student may view (their own answer sheet)
    answers: List[StudentAnswerView] = []


class StudentResultSummary(BaseModel):
    """One published result in a student's list."""
    submission_id: UUID
    exam_id: UUID
    exam_name: str
    total_score: Optional[float] = None
    max_score: Optional[float] = None
    percentage: Optional[float] = None
    published_at: Optional[datetime] = None


class MyResults(BaseModel):
    results: List[StudentResultSummary] = []
    awaiting: int = 0  # the student's answer sheets that aren't published yet
