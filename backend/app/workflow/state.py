"""Submission states (Proposal 002 §9). Teacher actions move a submission only along these edges;
the grading run itself moves PENDING -> PROCESSING -> GRADED / NEEDS_REVIEW / FAILED."""

from typing import Any, Optional
from uuid import UUID

from sqlmodel import Session

from app.core.constants import SubmissionStatus as S
from app.models.base import utcnow
from app.models.exam import Submission
from app.models.grade_event import GradeEvent

ALLOWED: dict[S, set[S]] = {
    S.PENDING: {S.PROCESSING},
    S.PROCESSING: {S.GRADED, S.NEEDS_REVIEW, S.FAILED},
    S.NEEDS_REVIEW: {S.GRADED, S.PENDING},  # all escalations resolved; regrade / transcript edit
    S.GRADED: {S.APPROVED, S.PENDING},
    S.APPROVED: {S.GRADED, S.PUBLISHED, S.PENDING},  # unapprove; publish; regrade clears the approval
    S.FAILED: {S.PENDING},
    S.PUBLISHED: set(),  # published results are final (changes after publishing: v2 backlog)
}


class WorkflowError(Exception):
    """The action isn't allowed in the submission's current state (HTTP 409)."""


def can_move(current: S, target: S) -> bool:
    return target in ALLOWED.get(current, set())


def transition(
    db: Session,
    submission: Submission,
    target: S,
    *,
    kind: str,
    actor_membership_id: Optional[UUID],
    reason: Optional[str] = None,
    question_id: Optional[UUID] = None,
    run_id: Optional[UUID] = None,
    before: Optional[dict[str, Any]] = None,
    after: Optional[dict[str, Any]] = None,
) -> GradeEvent:
    """Move the submission to `target` and record the event (the caller commits)."""
    current = submission.status
    if not can_move(current, target):
        raise WorkflowError(f"A {current.value} submission can't become {target.value}.")
    submission.status, submission.updated_at = target, utcnow()
    db.add(submission)
    return record(db, submission, kind, actor_membership_id=actor_membership_id, reason=reason,
                  question_id=question_id, run_id=run_id,
                  before={"status": current.value, **(before or {})}, after={"status": target.value, **(after or {})})


def record(
    db: Session,
    submission: Submission,
    kind: str,
    *,
    actor_membership_id: Optional[UUID],
    reason: Optional[str] = None,
    question_id: Optional[UUID] = None,
    run_id: Optional[UUID] = None,
    before: Optional[dict[str, Any]] = None,
    after: Optional[dict[str, Any]] = None,
) -> GradeEvent:
    """Record an event that doesn't change the submission's status (the caller commits)."""
    event = GradeEvent(submission_id=submission.id, question_id=question_id, run_id=run_id, kind=kind,
                       actor_membership_id=actor_membership_id, reason=reason, before=before or {}, after=after or {})
    db.add(event)
    return event
