from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class OrganizationBase(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class OrganizationCreate(OrganizationBase):
    name: str
    slug: str

class OrganizationUpdate(OrganizationBase):
    pass

class OrganizationInDBBase(OrganizationBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class Organization(OrganizationInDBBase):
    # The signed-in user's role here ("owner" for a superuser without a membership), so the portal can
    # show staff or student pages
    role: Optional[str] = None
