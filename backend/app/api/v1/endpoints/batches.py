from typing import List, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.org import Batch, Enrollment, Organization
from app.models.user import Membership, User
from app.api import deps
from app.schemas.batch import BatchCreate, BatchRead, EnrollmentCreate

router = APIRouter()

@router.post("/", response_model=BatchRead)
def create_batch(
    *,
    db: Session = Depends(get_session),
    batch_in: BatchCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new batch (Class).
    User must be a member of the Org (owner, admin, teacher).
    """
    # Verify permission
    # Note: Ideally move to Service/CRUD, but keeping logic here for now during migration
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == batch_in.org_id)
        # Assuming Role enum is handled as string in DB or we cast it. 
        # Better to use Membership.role.in_([Role.OWNER, Role.ADMIN, Role.TEACHER])
    ).first()
    
    # In strict guidelines we shouldn't do this, but for migration it preserves behavior.
    # We should use Role enum if possible.
    from app.core.constants import Role
    
    if not current_user.is_superuser:
        if not membership or membership.role not in [Role.OWNER, Role.ADMIN, Role.TEACHER]:
             raise HTTPException(status_code=403, detail="Not authorized to create batches for this organization")

    batch = Batch(org_id=batch_in.org_id, name=batch_in.name)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch

@router.get("/", response_model=List[BatchRead])
def read_batches(
    org_id: UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List batches for an org.
    """
    if not current_user.is_superuser:
        membership = db.exec(
            select(Membership)
            .where(Membership.user_id == current_user.id)
            .where(Membership.org_id == org_id)
        ).first()
        if not membership:
             raise HTTPException(status_code=403, detail="Not a member of this organization")

    batches = db.exec(select(Batch).where(Batch.org_id == org_id)).all()
    return batches

@router.post("/{batch_id}/enroll", response_model=Any)
def enroll_student(
    *,
    db: Session = Depends(get_session),
    batch_id: UUID,
    enrollment_in: EnrollmentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Enroll a student into a batch.
    User must be teacher/admin/owner.
    """
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    from app.core.constants import Role

    # Check permissions
    if not current_user.is_superuser:
        membership = db.exec(
            select(Membership)
            .where(Membership.user_id == current_user.id)
            .where(Membership.org_id == batch.org_id)
        ).first()
        
        if not membership or membership.role not in [Role.OWNER, Role.ADMIN, Role.TEACHER]:
             raise HTTPException(status_code=403, detail="Not authorized")

    # Find the student membership
    # 1. Find User by Email
    target_user = db.exec(select(User).where(User.email == enrollment_in.email)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found. Add them to Organization first.")
    
    # 2. Find Membership
    target_membership = db.exec(
        select(Membership)
        .where(Membership.user_id == target_user.id)
        .where(Membership.org_id == batch.org_id)
    ).first()
    
    if not target_membership:
        raise HTTPException(status_code=400, detail="User is not a member of this organization")

    # 3. Create Enrollment
    enrollment = Enrollment(batch_id=batch_id, membership_id=target_membership.id)
    db.add(enrollment)
    db.commit()
    return {"message": "Enrolled successfully"}
