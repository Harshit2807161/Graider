from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app import crud
from app.api import deps
from app.models.user import User
from app.schemas.org import Organization, OrganizationCreate
from app.services.org_service import org_service

router = APIRouter()

@router.get("/", response_model=List[Organization])
def read_organizations(
    db: Session = Depends(deps.get_session),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve organizations.
    """
    orgs = crud.org.get_multi(db, skip=skip, limit=limit)
    return orgs

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
    org_id: str,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete an organization and all related data (cascade).
    """
    org = crud.org.get(db, id=org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Use service to handle cascade deletion
    org_service.delete_organization(db, org_id=org_id)
    return {"status": "deleted"}
