"""Review workflow endpoints (Proposal 002 §9): teacher actions on grades, approval and publishing."""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app import crud
from app.api import deps
from app.models.exam import Exam, Question, Submission
from app.models.user import Membership, User
from app.schemas.exam import SubmissionRead
from app.schemas.review import (
    ActionReason,
    AnswerGradeRead,
    GradeActionResult,
    OverrideRequest,
    PublishResult,
    ResolveRequest,
    TranscriptEdit,
)
from app.worker import grade_submission_task
from app.workflow import actions

router = APIRouter()


def staff_submission(db: Session, submission_id: UUID, user: User) -> tuple[Submission, Exam, Optional[Membership]]:
    submission = crud.submission.get(db, id=submission_id)
    exam = crud.exam.get(db, id=submission.exam_id) if submission else None
    if not submission or not exam:
        raise HTTPException(status_code=404, detail="Submission not found")
    membership = deps.require_org_role(db, user=user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    return submission, exam, membership


def exam_question(db: Session, exam: Exam, question_id: UUID) -> Question:
    question = crud.question.get(db, id=question_id)
    if not question or question.exam_id != exam.id:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


def _actor(membership: Optional[Membership]) -> Optional[UUID]:
    return membership.id if membership else None


def _result(db: Session, grade: Any, submission: Submission) -> GradeActionResult:
    db.refresh(submission)
    return GradeActionResult(grade=AnswerGradeRead.model_validate(grade), submission=SubmissionRead.model_validate(submission))


@router.post("/submissions/{submission_id}/answers/{question_id}/override", response_model=GradeActionResult)
def override_grade(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, question_id: UUID, body: OverrideRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Set an answer's criterion scores (mandatory reason). Creates a new grade version; the old one is kept."""
    submission, exam, membership = staff_submission(db, submission_id, current_user)
    question = exam_question(db, exam, question_id)
    grade = actions.override(
        db, submission, question, expected_grade_id=body.expected_grade_id,
        criteria=[c.model_dump() for c in body.criteria], reason=body.reason, feedback=body.feedback,
        actor=_actor(membership),
    )
    return _result(db, grade, submission)


@router.post("/submissions/{submission_id}/answers/{question_id}/resolve", response_model=GradeActionResult)
def resolve_grade(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, question_id: UUID, body: ResolveRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Accept an escalated answer's proposed grade."""
    submission, exam, membership = staff_submission(db, submission_id, current_user)
    question = exam_question(db, exam, question_id)
    grade = actions.resolve(db, submission, question, expected_grade_id=body.expected_grade_id,
                            reason=body.reason, actor=_actor(membership))
    return _result(db, grade, submission)


@router.patch("/submissions/{submission_id}/answers/{question_id}/transcript", response_model=SubmissionRead)
def edit_transcript(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, question_id: UUID, body: TranscriptEdit,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Correct the transcript of one answer (mandatory reason); that question is regraded from it."""
    submission, exam, membership = staff_submission(db, submission_id, current_user)
    question = exam_question(db, exam, question_id)
    run = actions.edit_transcript(db, submission, question, text=body.text, reason=body.reason,
                                  actor=_actor(membership))
    grade_submission_task.delay(str(run.id))
    db.refresh(submission)
    return submission


@router.post("/submissions/{submission_id}/approve", response_model=SubmissionRead)
def approve_submission(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, body: Optional[ActionReason] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Approve the grades (refused while any answer still needs review)."""
    submission, _, membership = staff_submission(db, submission_id, current_user)
    return actions.approve(db, submission, reason=body.reason if body else None, actor=_actor(membership))


@router.post("/submissions/{submission_id}/unapprove", response_model=SubmissionRead)
def unapprove_submission(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, body: Optional[ActionReason] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    submission, _, membership = staff_submission(db, submission_id, current_user)
    return actions.unapprove(db, submission, reason=body.reason if body else None, actor=_actor(membership))


@router.post("/exams/{exam_id}/publish", response_model=PublishResult)
def publish_exam(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Publish the exam's approved submissions to their students. Others are left as they are."""
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    published, not_approved = actions.publish(db, exam, actor=_actor(membership))
    return PublishResult(published=published, not_approved=not_approved)
