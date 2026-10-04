from typing import List, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlmodel import Session, select

from app.api import deps
from app import crud
from app.models.org import Batch, Enrollment
from app.models.user import Membership, User
from app.schemas.batch import BatchCreate, BatchRead, EnrollmentCreate, StudentRead
from app.core.constants import Role
from app.services import enrollment_service

router = APIRouter()


def _get_batch_or_404(db: Session, batch_id: UUID) -> Batch:
    batch = crud.batch.get(db, id=batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.post("/", response_model=BatchRead)
def create_batch(
    *,
    db: Session = Depends(deps.get_session),
    batch_in: BatchCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new batch (Class). Org owners and admins only.
    """
    # Verify org exists
    org = crud.org.get(db, id=batch_in.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    deps.require_org_role(db, user=current_user, org_id=batch_in.org_id, roles=deps.ADMIN_ROLES)

    batch = crud.batch.create(db, obj_in=batch_in)
    return batch

@router.get("/", response_model=List[BatchRead])
def read_batches(
    org_id: UUID,
    db: Session = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List batches for an org.
    """
    # Verify org exists
    org = crud.org.get(db, id=org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    deps.require_org_role(db, user=current_user, org_id=org_id, roles=deps.STAFF_ROLES)

    batches = crud.batch.get_by_org(db, org_id=org_id)
    return batches

@router.delete("/{batch_id}")
def delete_batch(
    *,
    db: Session = Depends(deps.get_session),
    batch_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete a batch (soft delete).
    """
    batch = _get_batch_or_404(db, batch_id)
    deps.require_org_role(db, user=current_user, org_id=batch.org_id, roles=deps.ADMIN_ROLES)

    crud.batch.remove(db, id=batch_id)
    return {"status": "deleted"}

@router.post("/{batch_id}/enroll", response_model=Any)
def enroll_student(
    *,
    db: Session = Depends(deps.get_session),
    batch_id: UUID,
    enrollment_in: EnrollmentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Enroll a student into a batch.
    """
    batch = _get_batch_or_404(db, batch_id)
    deps.require_org_role(db, user=current_user, org_id=batch.org_id, roles=deps.STAFF_ROLES)

    # Find the student membership
    target_user = crud.user.get_by_email(db, email=enrollment_in.email.strip().lower())
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found. Add them to system first.")

    membership = deps.get_membership(db, user=target_user, org_id=batch.org_id)
    if not membership:
        raise HTTPException(status_code=400, detail="User is not a member of this organization")
    if membership.role != Role.STUDENT:
        raise HTTPException(status_code=400, detail="Only students can be enrolled in a class")

    # Check already enrolled
    existing = db.exec(
        select(Enrollment)
        .where(Enrollment.batch_id == batch_id)
        .where(Enrollment.membership_id == membership.id)
    ).first()
    if existing:
        if existing.deleted_at is None:
            return {"message": "Already enrolled"}
        # Re-enrolling a previously removed student: revive the row (unique constraint)
        existing.deleted_at = None
        db.add(existing)
        db.commit()
        return {"message": "Enrolled successfully"}

    # Create Enrollment
    enrollment = Enrollment(batch_id=batch_id, membership_id=membership.id)
    db.add(enrollment)
    db.commit()
    return {"message": "Enrolled successfully"}

@router.post("/{batch_id}/upload-students")
async def upload_students(
    *,
    db: Session = Depends(deps.get_session),
    batch_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Upload an Excel/CSV roster to enroll students into a batch.
    """
    batch = _get_batch_or_404(db, batch_id)
    deps.require_org_role(db, user=current_user, org_id=batch.org_id, roles=deps.STAFF_ROLES)
    return await enrollment_service.process_student_roster(db, batch_id, file)

@router.get("/{batch_id}/students", response_model=List[StudentRead])
def read_batch_students(
    *,
    db: Session = Depends(deps.get_session),
    batch_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get students enrolled in a batch.
    """
    batch = _get_batch_or_404(db, batch_id)
    deps.require_org_role(db, user=current_user, org_id=batch.org_id, roles=deps.STAFF_ROLES)

    # Query join Enrollment -> Membership -> User
    students = db.exec(
        select(
            Membership.id.label("membership_id"),
            User.id,
            User.full_name,
            User.email,
            Enrollment.created_at.label("enrolled_at"),
        )
        .join(Membership, Membership.user_id == User.id)
        .join(Enrollment, Enrollment.membership_id == Membership.id)
        .where(Enrollment.batch_id == batch_id)
        .where(Enrollment.deleted_at == None)  # noqa: E711
        .order_by(User.full_name)
    ).all()

    return students
