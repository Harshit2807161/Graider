from uuid import UUID
from sqlmodel import Session, select

from app import crud
from app.models.org import Organization, Batch, Enrollment
from app.models.user import Membership
from app.schemas.org import OrganizationCreate
from app.core.constants import Role

class OrgService:
    def create_organization_with_owner(
        self, db: Session, *, obj_in: OrganizationCreate, owner_id: UUID
    ) -> Organization:
        """
        Create a new organization and assign the creator as the OWNER.
        """
        # 1. Create Org
        org = crud.org.create(db, obj_in=obj_in)
        
        # 2. Create Membership
        membership = Membership(
            user_id=owner_id,
            org_id=org.id,
            role=Role.OWNER,
            profile_data={}
        )
        db.add(membership)
        db.commit()
        
        return org
    
    def delete_organization(self, db: Session, *, org_id: UUID) -> None:
        """
        Soft delete an organization.
        Related records (memberships, batches, etc.) remain but organization is marked as deleted.
        """
        crud.org.remove(db, id=org_id)

org_service = OrgService()
