"""Audit tables: the system of record for what the AI did.

- `grading_runs`: one row per grading attempt of a submission (status, config snapshot, totals).
  The run id is the idempotency key for the Celery task; status only moves forward.
- `llm_calls`: one row per model call attempt (failures included), append-only: Postgres triggers
  reject UPDATE, DELETE and TRUNCATE. Images are stored by reference + sha256, never as bytes.
  Every call belongs to a grading run, a question (rubric parsing) or an exam draft (extraction).
  Calls are committed as they happen; if one can't be written the run fails (fail closed).

Neither table soft-deletes: audit rows are never removed.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import JSON, CheckConstraint, Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.models.base import utcnow

# JSONB on Postgres (indexable, compact), plain JSON elsewhere (SQLite tests)
JSONType = JSON().with_variant(JSONB(), "postgresql")


class RunStatus:
    """Values for GradingRun.status (stored as VARCHAR, not a Postgres enum)."""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    TERMINAL = (SUCCEEDED, FAILED)


class GradingRun(SQLModel, table=True):
    __tablename__ = "grading_runs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submissions.id", index=True)
    trigger: str  # "upload" | "regrade"
    status: str = Field(default=RunStatus.QUEUED, index=True)
    # Resolved model chains per role, budgets, egress setting: what this run was configured with
    config_snapshot: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONType, nullable=False))
    config_hash: str = ""
    code_version: Optional[str] = None  # git SHA of the deployed code (prompts live in code)
    error: Optional[str] = None
    llm_calls: int = 0
    cost_usd: float = 0.0
    trace_id: Optional[str] = None  # Langfuse trace (soft link; observability, not audit)
    created_by_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
    created_at: datetime = Field(default_factory=utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class LLMCall(SQLModel, table=True):
    __tablename__ = "llm_calls"
    __table_args__ = (
        CheckConstraint(
            "run_id IS NOT NULL OR question_id IS NOT NULL OR exam_draft_id IS NOT NULL",
            name="ck_llm_calls_belongs_to_something",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    run_id: Optional[UUID] = Field(default=None, foreign_key="grading_runs.id", index=True)
    submission_id: Optional[UUID] = Field(default=None, foreign_key="submissions.id", index=True)
    question_id: Optional[UUID] = Field(default=None, foreign_key="questions.id", index=True)
    exam_draft_id: Optional[UUID] = Field(default=None, foreign_key="exam_drafts.id", index=True)
    question_label: Optional[str] = None  # "Q1", "Q2", ...
    role: str
    purpose: str
    round: Optional[int] = None
    attempt_no: int
    attempt_kind: str  # initial | repair | truncation_retry | fallback

    provider: str
    model_requested: str
    model_answered: Optional[str] = None
    base_url: Optional[str] = None
    external: bool
    model_revision: Optional[str] = None
    quantization: Optional[str] = None

    request: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONType, nullable=False))
    response_raw: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONType, nullable=True))
    parsed: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONType, nullable=True))
    stop_reason: Optional[str] = None
    provider_stop_reason: Optional[str] = None
    refusal_detail: Optional[str] = None
    response_id: Optional[str] = None
    request_id: Optional[str] = None

    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    reasoning_tokens: int = 0
    cost_usd: Optional[float] = None
    latency_ms: int = 0

    schema_name: str
    schema_hash: str
    degraded: bool = False
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    fallback_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
