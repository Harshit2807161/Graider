from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Field, Relationship, JSON, Column
from sqlalchemy import UniqueConstraint

from app.models.base import Base, utcnow

if TYPE_CHECKING:
    from app.models.user import Membership
    from app.models.exam import Exam

# 1. Organization (Tenant)
class Organization(Base, table=True):
    __tablename__ = "organizations"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    slug: str = Field(unique=True, index=True)
    description: Optional[str] = None
    config: Dict[str, Any] = Field(default={}, sa_column=Column(JSON)) # Generic: {"grading_scale": "GPA"}
    created_at: datetime = Field(default_factory=utcnow)

    memberships: List["Membership"] = Relationship(back_populates="organization")
    batches: List["Batch"] = Relationship(back_populates="organization")
    exams: List["Exam"] = Relationship(back_populates="organization")


# 4. Batch (Class/Course)
class Batch(Base, table=True):
    __tablename__ = "batches"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id")
    name: str # "Class 10-A"
    created_at: datetime = Field(default_factory=utcnow)

    organization: Organization = Relationship(back_populates="batches")
    enrollments: List["Enrollment"] = Relationship(back_populates="batch")
    exams: List["Exam"] = Relationship(back_populates="batch")


# 5. Enrollment (Student -> Batch)
class Enrollment(Base, table=True):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("batch_id", "membership_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    batch_id: UUID = Field(foreign_key="batches.id")
    membership_id: UUID = Field(foreign_key="memberships.id")
    created_at: datetime = Field(default_factory=utcnow)

    batch: Batch = Relationship(back_populates="enrollments")
    membership: "Membership" = Relationship(back_populates="enrollments")
