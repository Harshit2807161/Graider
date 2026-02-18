from uuid import UUID
from typing import Optional
from fastapi.encoders import jsonable_encoder
from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models.org import Organization
from app.schemas.org import OrganizationCreate, OrganizationUpdate

class CRUDOrganization(CRUDBase[Organization, OrganizationCreate, OrganizationUpdate]):
    def get_by_slug(self, db: Session, *, slug: str) -> Optional[Organization]:
        """Get organization by slug"""
        statement = select(Organization).where(Organization.slug == slug)
        return db.exec(statement).first()
    
    def create(self, db: Session, *, obj_in: OrganizationCreate) -> Organization:
        """Override create to handle organization-specific defaults"""
        obj_in_data = jsonable_encoder(obj_in)
        # Ensure config has default empty dict if not provided
        if obj_in_data.get('config') is None:
            obj_in_data['config'] = {}
        
        db_obj = self.model.model_validate(obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

org = CRUDOrganization(Organization)
