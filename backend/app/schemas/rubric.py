"""API schemas for rubric specs."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.rubrics.schema import RubricSpec


class RubricSpecRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question_id: UUID
    version: int
    source: str  # "ai" | "teacher"
    status: str  # "ready" | "invalid"
    validation_errors: list[str]
    spec: RubricSpec
    parser_prompt_version: Optional[str]
    model: Optional[str]
    created_by_membership_id: Optional[UUID]
    created_at: datetime


class QuestionRubricStatus(BaseModel):
    """One row of an exam's rubric overview."""

    question_id: UUID
    label: str  # "Q1", "Q2", ... (the label grading uses)
    rubric_status: str
    rubric_error: Optional[str]
    spec_version: Optional[int]
    source: Optional[str]
    kind: Optional[str]
    subject: Optional[str]
    derived: Optional[bool]
    criteria_count: Optional[int]
    validation_errors: list[str]
    parser_warnings: list[str]
