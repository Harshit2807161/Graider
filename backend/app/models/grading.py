"""Versioned transcriptions and answer grades: what the system read and decided, per question.

Every grading run (or teacher edit, M6) adds a new version; exactly one version per (submission,
question) is current. Rows are append-only: on Postgres a trigger rejects any change except
switching `is_current`. `submission_answers` stays as a projection of the current versions for
the UI.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, Index, UniqueConstraint, text
from sqlmodel import Field, SQLModel

from app.models.audit import JSONType
from app.models.base import utcnow


class Source:
    AI = "ai"
    TEACHER = "teacher"


class AnswerStatus:
    GRADED = "graded"
    ESCALATED = "escalated"  # needs a teacher; `escalation_reason` says why (a proposed score may exist)
    NOT_ATTEMPTED = "not_attempted"  # an alternative of a choice group the student didn't answer


class EscalationReason:
    NO_ANSWER_FOUND = "no_answer_found"
    RUBRIC_INVALID = "rubric_invalid"
    LOW_OCR_CONFIDENCE = "low_ocr_confidence"
    MULTIPLE_ATTEMPTS = "multiple_attempts"
    PAGE_INVENTORY_MISMATCH = "page_inventory_mismatch"
    CHECK_FAILED = "check_failed"
    EVIDENCE_NOT_FOUND = "evidence_not_found"
    EVALUATOR_DISAGREEMENT = "evaluator_disagreement"
    ALL_MODELS_FAILED = "all_models_failed"
    SPOT_CHECK = "spot_check"

    @staticmethod
    def grader_flag(flag: str) -> str:
        return f"grader_flag:{flag}"


def _current_index(table: str) -> Index:
    # One current version per (submission, question)
    return Index(
        f"uq_{table}_current", "submission_id", "question_id", unique=True,
        postgresql_where=text("is_current"), sqlite_where=text("is_current"),
    )


class Transcription(SQLModel, table=True):
    __tablename__ = "transcriptions"
    __table_args__ = (
        UniqueConstraint("submission_id", "question_id", "version", name="uq_transcriptions_version"),
        _current_index("transcriptions"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submissions.id", index=True)
    question_id: UUID = Field(foreign_key="questions.id", index=True)
    run_id: Optional[UUID] = Field(default=None, foreign_key="grading_runs.id")
    version: int
    source: str  # Source
    text: str
    # Where the text came from: page, label as written, start/continuation, crossed out, confidence
    segments: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSONType, nullable=False))
    confidence: Optional[float] = None  # lowest segment confidence
    flags: list[str] = Field(default_factory=list, sa_column=Column(JSONType, nullable=False))
    is_current: bool = True
    created_by_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
    created_at: datetime = Field(default_factory=utcnow)


class AnswerGrade(SQLModel, table=True):
    __tablename__ = "answer_grades"
    __table_args__ = (
        UniqueConstraint("submission_id", "question_id", "version", name="uq_answer_grades_version"),
        _current_index("answer_grades"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submissions.id", index=True)
    question_id: UUID = Field(foreign_key="questions.id", index=True)
    run_id: Optional[UUID] = Field(default=None, foreign_key="grading_runs.id")
    version: int
    source: str  # Source
    status: str  # AnswerStatus
    score: Optional[float] = None  # None when there's nothing to propose (e.g. no answer found)
    max_score: float
    counted: bool = True  # counts toward the submission total (False for an unattempted alternative)
    criteria: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSONType, nullable=False))
    rounds: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSONType, nullable=False))
    flags: list[str] = Field(default_factory=list, sa_column=Column(JSONType, nullable=False))
    escalation_reason: Optional[str] = None
    feedback: Optional[str] = None  # for the student
    rubric_spec_id: Optional[UUID] = Field(default=None, foreign_key="rubric_specs.id")
    transcription_id: Optional[UUID] = Field(default=None, foreign_key="transcriptions.id")
    grader_model: Optional[str] = None
    evaluator_model: Optional[str] = None
    fallback_used: bool = False
    override_reason: Optional[str] = None  # teacher overrides (M6)
    is_current: bool = True
    created_by_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
    created_at: datetime = Field(default_factory=utcnow)
