"""Rubric specs: versioned, append-only parsed rubrics (Proposal 002, section 6).

Every parse or teacher edit adds a new version. A question's current spec is its newest version
whose `input_hash` matches the question's current inputs (text, rubric text, max score, type);
`questions.rubric_status` says whether that spec exists and can be graded against.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.models.audit import JSONType
from app.models.base import utcnow


class RubricStatus:
    """Values for Question.rubric_status (stored as VARCHAR)."""

    MISSING = "missing"  # never parsed (e.g. questions created before rubric specs existed)
    PENDING = "pending"  # inputs changed; a parse is queued
    READY = "ready"  # the current spec passed every check
    INVALID = "invalid"  # the current spec fails a check; the teacher must edit it
    ERROR = "error"  # parsing failed (model/transport); retried on re-parse or at grading


class RubricSpecSource:
    AI = "ai"
    TEACHER = "teacher"


class RubricSpecRecord(SQLModel, table=True):
    __tablename__ = "rubric_specs"
    __table_args__ = (UniqueConstraint("question_id", "version", name="uq_rubric_specs_question_version"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    question_id: UUID = Field(foreign_key="questions.id", index=True)
    version: int
    source: str  # RubricSpecSource
    status: str  # RubricStatus.READY or RubricStatus.INVALID
    validation_errors: list[str] = Field(default_factory=list, sa_column=Column(JSONType, nullable=False))
    spec: dict[str, Any] = Field(sa_column=Column(JSONType, nullable=False))  # RubricSpec
    input_hash: str
    # The question as it was when parsed: text, rubric text, max score, type
    inputs: dict[str, Any] = Field(sa_column=Column(JSONType, nullable=False))
    parser_prompt_version: Optional[str] = None
    model: Optional[str] = None  # model that answered (AI specs)
    llm_call_id: Optional[UUID] = Field(default=None, foreign_key="llm_calls.id")
    created_by_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
    created_at: datetime = Field(default_factory=utcnow)
