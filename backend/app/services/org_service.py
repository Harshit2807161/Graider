from uuid import UUID
from sqlmodel import Session

from app import crud
from app.models.org import Organization
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
        # 1. Create Org directly to avoid None-field validation issues
        org = Organization(
            name=obj_in.name,
            slug=obj_in.slug,
            config=obj_in.config or {},
        )
        db.add(org)
        db.flush()
        
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

org_service = OrgService()
