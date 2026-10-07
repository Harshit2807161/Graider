"""API schemas for exam documents and exam drafts."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.exam_drafts.schema import DraftContent, Issue


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    position: int
    original_filename: str
    kind: str
    status: str
    error: Optional[str]
    page_count: Optional[int]
    created_at: datetime


class DraftCreate(BaseModel):
    document_ids: list[UUID]


class DraftEdit(BaseModel):
    content: DraftContent


class DraftSummary(BaseModel):
    id: UUID
    version: int
    source: str
    status: str
    based_on_id: Optional[UUID]
    question_count: Optional[int]
    blocking: int
    warnings: int
    created_at: datetime
    confirmed_at: Optional[datetime]


class DraftRead(BaseModel):
    id: UUID
    exam_id: UUID
    version: int
    source: str
    status: str
    based_on_id: Optional[UUID]
    document_ids: list[UUID]
    content: Optional[DraftContent]
    issues: list[Issue]
    error: Optional[str]
    created_at: datetime
    confirmed_at: Optional[datetime]
