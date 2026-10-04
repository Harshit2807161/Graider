from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


def utcnow() -> datetime:
    """Timezone-aware current UTC time (SQLModel >= 0.0.45 rejects naive datetimes)."""
    return datetime.now(timezone.utc)


class Base(SQLModel):
    """Base model with soft delete support"""
    deleted_at: Optional[datetime] = Field(default=None, nullable=True, index=True)
    class Config:
        validate_assignment = True
