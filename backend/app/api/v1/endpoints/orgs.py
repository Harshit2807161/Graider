from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app import crud
from app.api import deps
from app.core.constants import Role
from app.models.org import Organization as OrganizationModel
from app.models.user import Membership, User
from app.schemas.org import Organization, OrganizationCreate
from app.services.org_service import org_service
from app.models.audit import GradingRun, LLMCall
from app.models.base import utcnow
from app.models.exam import Exam, Submission, SubmissionAnswer
from app.models.grade_event import GradeEvent
from app.models.grading import AnswerGrade, Transcription
from app.schemas.student_export import ExportMembership, ExportSubmission, StudentExport

router = APIRouter()

@router.get("/", response_model=List[Organization])
def read_organizations(
    db: Session = Depends(deps.get_session),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve organizations: all of them for superusers, otherwise the ones the user belongs to.
    """
    roles = {m.org_id: m.role.value for m in db.exec(select(Membership).where(
        Membership.user_id == current_user.id, Membership.deleted_at == None)).all()}  # noqa: E711
    if current_user.is_superuser:
        orgs = crud.org.get_multi(db, skip=skip, limit=limit)
    else:
        orgs = db.exec(
            select(OrganizationModel)
            .join(Membership, Membership.org_id == OrganizationModel.id)
            .where(Membership.user_id == current_user.id)
            .where(Membership.deleted_at == None)  # noqa: E711
            .where(OrganizationModel.deleted_at == None)  # noqa: E711
            .offset(skip)
            .limit(limit)
        ).all()
    fallback = Role.OWNER.value if current_user.is_superuser else None
    return [Organization.model_validate(o).model_copy(update={"role": roles.get(o.id, fallback)}) for o in orgs]

@router.get("/{org_id}", response_model=Organization)
def read_organization(
    *,
    db: Session = Depends(deps.get_session),
    org_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    org = crud.org.get(db, id=org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    deps.require_org_role(db, user=current_user, org_id=org_id)
    return org

@router.post("/", response_model=Organization)
def create_organization(
    *,
    db: Session = Depends(deps.get_session),
    org_in: OrganizationCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new organization.
    """
    # Check if slug already exists
    existing_org = crud.org.get_by_slug(db, slug=org_in.slug)
    if existing_org:
        raise HTTPException(
            status_code=400,
            detail=f"Organization with slug '{org_in.slug}' already exists"
        )

    org = org_service.create_organization_with_owner(
        db, obj_in=org_in, owner_id=current_user.id
    )
    return org

@router.delete("/{org_id}")
def delete_organization(
    *,
    db: Session = Depends(deps.get_session),
    org_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Soft-delete an organization. Allowed for superusers and the org's owner.
    """
    org = crud.org.get(db, id=org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    deps.require_org_role(db, user=current_user, org_id=org_id, roles=(Role.OWNER,))

    org_service.delete_organization(db, org_id=org_id)
    return {"status": "deleted"}


_CALL_FIELDS = (
    "role", "purpose", "question_label", "round", "attempt_no", "attempt_kind", "provider", "model_requested",
    "model_answered", "external", "stop_reason", "error_type", "error_message", "fallback_reason", "degraded",
    "input_tokens", "output_tokens", "cost_usd", "latency_ms", "schema_name", "created_at",
)
_RUN_FIELDS = (
    "trigger", "question_ids", "status", "error", "llm_calls", "cost_usd", "config_hash", "code_version",
    "created_by_membership_id", "created_at", "started_at", "finished_at",
)


@router.get("/{org_id}/students/{membership_id}/export", response_model=StudentExport)
def export_student(
    org_id: UUID,
    membership_id: UUID,
    db: Session = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Everything recorded about one student's grading in this org (GDPR Art. 15, FERPA). Owner/admin only."""
    deps.require_org_role(db, user=current_user, org_id=org_id, roles=(Role.OWNER, Role.ADMIN))
    member = db.get(Membership, membership_id)
    if not member or member.org_id != org_id or member.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Student not found")
    user = db.get(User, member.user_id)
    submissions = db.exec(
        select(Submission, Exam).join(Exam, Exam.id == Submission.exam_id)
        .where(Submission.student_membership_id == member.id, Exam.org_id == org_id,
               Submission.deleted_at.is_(None))  # type: ignore[union-attr]
        .order_by(Submission.created_at)
    ).all()

    def rows(model: Any, submission_id: UUID) -> list[Any]:
        return list(db.exec(select(model).where(model.submission_id == submission_id)
                            .order_by(model.created_at)).all())

    out = []
    for sub, exam in submissions:
        out.append(ExportSubmission(
            id=sub.id, exam_id=exam.id, exam_title=exam.name, status=getattr(sub.status, "value", str(sub.status)),
            total_score=sub.total_score, max_score=sub.max_score, percentage=sub.percentage,
            created_at=sub.created_at, updated_at=sub.updated_at,
            runs=[{"id": r.id, **{k: getattr(r, k) for k in _RUN_FIELDS}} for r in rows(GradingRun, sub.id)],
            llm_calls=[{"id": c.id, "run_id": c.run_id, **{k: getattr(c, k) for k in _CALL_FIELDS}}
                       for c in rows(LLMCall, sub.id)],
            transcriptions=rows(Transcription, sub.id),
            grades=rows(AnswerGrade, sub.id),
            answers=[{k: getattr(a, k) for k in ("id", "question_id", "student_answer_text", "score", "feedback",
                                                 "reasoning", "status", "escalation_reason", "created_at")}
                     for a in db.exec(select(SubmissionAnswer).where(SubmissionAnswer.submission_id == sub.id,
                                      SubmissionAnswer.deleted_at.is_(None))).all()],  # type: ignore[union-attr]
            grade_events=[{k: getattr(e, k) for k in ("id", "question_id", "run_id", "kind", "actor_membership_id",
                                                      "reason", "before", "after", "created_at")}
                          for e in rows(GradeEvent, sub.id)],
        ))
    return StudentExport(
        generated_at=utcnow(),
        membership=ExportMembership(id=member.id, org_id=member.org_id, user_id=member.user_id, role=getattr(member.role, "value", str(member.role)),
                                    email=getattr(user, "email", None), full_name=getattr(user, "full_name", None)),
        submissions=out,
    )
