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
