from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Field, Relationship, JSON, Column
from sqlalchemy import UniqueConstraint

from app.models.base import Base, utcnow
from app.core.constants import Role

if TYPE_CHECKING:
    from app.models.org import Organization, Enrollment
    from app.models.exam import Exam, Submission

# 3. Membership (The Link / Role)
class Membership(Base, table=True):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "org_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    org_id: UUID = Field(foreign_key="organizations.id")
    
    role: Role = Field(description="owner, admin, teacher, student")
    
    # Generic Profile: {"roll_number": "123", "house": "Red"}
    profile_data: Dict[str, Any] = Field(default={}, sa_column=Column(JSON)) 
    
    created_at: datetime = Field(default_factory=utcnow)

    user: "User" = Relationship(back_populates="memberships")
    organization: "Organization" = Relationship(back_populates="memberships")
    enrollments: List["Enrollment"] = Relationship(back_populates="membership")
    
    # Relationships for things a User DOES
    exams_created: List["Exam"] = Relationship(back_populates="created_by")
    submissions: List["Submission"] = Relationship(back_populates="student_membership")


# 2. User (Identity - Global)
class User(Base, table=True):
    __tablename__ = "users"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    hashed_password: Optional[str] = None
    is_superuser: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)

    memberships: List["Membership"] = Relationship(back_populates="user")
