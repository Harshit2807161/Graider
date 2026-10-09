"""Grade events: every human action on a submission's grades and status, append-only.

Who did what (override, resolve, transcript edit, regrade request, approve, unapprove, publish),
the values before and after, and why. Together with grading runs, llm_calls and the versioned
transcriptions/grades, this is the submission's audit timeline.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlmodel import Field, SQLModel

from app.models.audit import JSONType
from app.models.base import utcnow


class EventKind:
    OVERRIDE = "override"  # a teacher changed criterion scores
    RESOLVE = "resolve"  # a teacher accepted an escalated answer's proposed grade
    TRANSCRIPT_EDIT = "transcript_edit"  # a teacher corrected a transcript (that question is regraded)
    REGRADE_REQUESTED = "regrade_requested"
    APPROVE = "approve"
    UNAPPROVE = "unapprove"
    PUBLISH = "publish"
    REVIEW_COMPLETE = "review_complete"  # the last escalation was cleared (NEEDS_REVIEW -> GRADED)


class GradeEvent(SQLModel, table=True):
    __tablename__ = "grade_events"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submissions.id", index=True)
    question_id: Optional[UUID] = Field(default=None, foreign_key="questions.id")
    run_id: Optional[UUID] = Field(default=None, foreign_key="grading_runs.id")  # the run it started, if any
    kind: str  # EventKind
    actor_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
    reason: Optional[str] = None
    before: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONType, nullable=False))
    after: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONType, nullable=False))
    created_at: datetime = Field(default_factory=utcnow)
