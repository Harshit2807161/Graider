"""Review workflow: teacher actions on grades, and what the review screens read."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.exam import SubmissionRead


def _required_text(value: str) -> str:
    if not value.strip():
        raise ValueError("must not be blank")
    return value.strip()


class CriterionScore(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    score: float
    justification: Optional[str] = None  # the teacher's note for this criterion


class OverrideRequest(BaseModel):
    """Set every criterion's score. `expected_grade_id` is the grade the teacher was looking at: if it's
    no longer current, the request is refused (409) instead of overwriting someone else's change."""
    model_config = ConfigDict(extra="forbid")
    expected_grade_id: UUID
    criteria: list[CriterionScore] = Field(min_length=1)
    reason: str = Field(max_length=2000)
    feedback: Optional[str] = Field(default=None, max_length=5000)  # replaces the feedback to the student

    _reason = field_validator("reason")(_required_text)


class ResolveRequest(BaseModel):
    """Accept an escalated answer's proposed grade as it is."""
    model_config = ConfigDict(extra="forbid")
    expected_grade_id: UUID
    reason: Optional[str] = Field(default=None, max_length=2000)


class TranscriptEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(max_length=20000)
    reason: str = Field(max_length=2000)

    _text = field_validator("text")(_required_text)
    _reason = field_validator("reason")(_required_text)


class ActionReason(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: Optional[str] = Field(default=None, max_length=2000)


class TranscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    question_id: UUID
    run_id: Optional[UUID]
    version: int
    source: str
    text: str
    segments: list[dict[str, Any]]
    confidence: Optional[float]
    flags: list[str]
    is_current: bool
    created_by_membership_id: Optional[UUID]
    created_at: datetime


class AnswerGradeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    question_id: UUID
    run_id: Optional[UUID]
    version: int
    source: str
    status: str
    score: Optional[float]
    max_score: float
    counted: bool
    criteria: list[dict[str, Any]]
    rounds: list[dict[str, Any]]
    flags: list[str]
    escalation_reason: Optional[str]
    feedback: Optional[str]
    rubric_spec_id: Optional[UUID]
    transcription_id: Optional[UUID]
    grader_model: Optional[str]
    evaluator_model: Optional[str]
    fallback_used: bool
    override_reason: Optional[str]
    is_current: bool
    created_by_membership_id: Optional[UUID]
    created_at: datetime


class GradeActionResult(BaseModel):
    grade: AnswerGradeRead
    submission: SubmissionRead


class PublishResult(BaseModel):
    published: int
    not_approved: int  # submissions still being graded, needing review, or not yet approved


class ReviewQueueItem(BaseModel):
    submission_id: UUID
    submission_status: str
    student_membership_id: Optional[UUID]
    student_name: Optional[str]
    question_id: UUID
    question_label: str
    grade_id: UUID
    status: str
    escalation_reason: Optional[str]
    score: Optional[float]
    max_score: float
    agreement: Optional[float]  # the last evaluator round's effective agreement
    rubric_outdated: bool  # graded with a spec that is no longer the question's current ready one


class PageRead(BaseModel):
    number: int  # 1-based, as transcription segments refer to pages
    document_id: UUID
    page_index: int
    kind: str
    width: Optional[int]
    height: Optional[int]
    has_image: bool


class QuestionReview(BaseModel):
    question_id: UUID
    label: str
    printed_label: Optional[str]
    text: str
    max_score: float
    choice_group: Optional[str]
    rubric_spec: Optional[dict[str, Any]]  # the spec the current grade used (id, version, status, spec)
    rubric_outdated: bool  # the current grade's spec is no longer the question's current ready spec
    transcription: Optional[TranscriptionRead]
    grade: Optional[AnswerGradeRead]
    previous_grades: list[AnswerGradeRead]  # newest first


class SubmissionReview(BaseModel):
    submission: SubmissionRead
    student_name: Optional[str]
    pages: list[PageRead]
    unassigned_segments: list[dict[str, Any]]  # answers the model couldn't place
    questions: list[QuestionReview]


class TimelineEntry(BaseModel):
    at: datetime
    type: str  # run | llm_call | transcription | grade | event
    question_label: Optional[str]
    actor_membership_id: Optional[UUID]
    data: dict[str, Any]
