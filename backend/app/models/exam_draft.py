"""Exam drafts: an exam's questions and rubrics extracted from its documents, for the teacher to
check and confirm (Proposal 003 §5.4).

Each extraction or teacher edit is a new version. Content is never changed once written; only the
status moves (pending -> ready | failed; ready -> confirmed | superseded). Confirming a draft
creates or updates the exam's questions.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.models.audit import JSONType
from app.models.base import utcnow


class DraftStatus:
    PENDING = "pending"  # extraction queued or running
    READY = "ready"  # extracted (or edited) and checked; see `issues`
    FAILED = "failed"  # extraction failed; see `error`
    CONFIRMED = "confirmed"  # applied to the exam's questions
    SUPERSEDED = "superseded"  # a newer version exists, or another draft was confirmed


class DraftSource:
    AI = "ai"
    TEACHER = "teacher"


class ExamDraft(SQLModel, table=True):
    __tablename__ = "exam_drafts"
    __table_args__ = (UniqueConstraint("exam_id", "version", name="uq_exam_drafts_exam_version"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    exam_id: UUID = Field(foreign_key="exams.id", index=True)
    version: int
    source: str  # DraftSource
    status: str = DraftStatus.PENDING
    based_on_id: Optional[UUID] = Field(default=None, foreign_key="exam_drafts.id")  # teacher edits
    document_ids: list[str] = Field(default_factory=list, sa_column=Column(JSONType, nullable=False))
    content: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONType))  # DraftContent
    issues: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSONType, nullable=False))
    error: Optional[str] = None
    created_by_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
    created_at: datetime = Field(default_factory=utcnow)
    confirmed_at: Optional[datetime] = None
    confirmed_by_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
