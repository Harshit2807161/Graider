from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class Base(SQLModel):
    """Base model with soft delete support"""
    deleted_at: Optional[datetime] = Field(default=None, nullable=True, index=True)
    class Config:
        validate_assignment = True
