"""Per-student audit export (GDPR Art. 15, FERPA): everything recorded about one student's grading."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.review import AnswerGradeRead, TranscriptionRead


class ExportMembership(BaseModel):
    id: UUID
    org_id: UUID
    user_id: UUID
    role: str
    email: Optional[str]
    full_name: Optional[str]


class ExportSubmission(BaseModel):
    id: UUID
    exam_id: UUID
    exam_title: Optional[str]
    status: str
    total_score: Optional[float]
    max_score: Optional[float]
    percentage: Optional[float]
    created_at: datetime
    updated_at: datetime
    runs: list[dict[str, Any]]
    llm_calls: list[dict[str, Any]]  # metadata only, never raw request/response bodies
    transcriptions: list[TranscriptionRead]
    grades: list[AnswerGradeRead]
    answers: list[dict[str, Any]]
    grade_events: list[dict[str, Any]]


class StudentExport(BaseModel):
    generated_at: datetime
    membership: ExportMembership
    submissions: list[ExportSubmission]
