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
    pass
