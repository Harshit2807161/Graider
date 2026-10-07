"""Persist every model call attempt to `llm_calls`, linked to its grading run and/or question."""

from typing import Optional
from uuid import UUID

from sqlmodel import Session

from app.core.db import engine
from app.llm.recorder import LogRecorder
from app.llm.types import AttemptRecord
from app.models.audit import LLMCall


def to_row(
    attempt: AttemptRecord,
    run_id: Optional[UUID],
    submission_id: Optional[UUID],
    question_id: Optional[UUID] = None,
    exam_draft_id: Optional[UUID] = None,
) -> LLMCall:
    usage = attempt.usage
    return LLMCall(
        id=attempt.id,
        run_id=run_id,
        submission_id=submission_id,
        question_id=question_id,
        exam_draft_id=exam_draft_id,
        question_label=attempt.context.question_id,
        role=attempt.role.value,
        purpose=attempt.context.purpose,
        round=attempt.context.round,
        attempt_no=attempt.attempt_no,
        attempt_kind=attempt.attempt_kind,
        provider=attempt.provider.value,
        model_requested=attempt.model_requested,
        model_answered=attempt.model_answered,
        base_url=attempt.base_url,
        external=attempt.external,
        model_revision=attempt.model_revision,
        quantization=attempt.quantization,
        request=attempt.request,
        response_raw=attempt.response_raw,
        parsed=attempt.parsed,
        stop_reason=attempt.stop_reason,
        provider_stop_reason=attempt.provider_stop_reason,
        refusal_detail=attempt.refusal_detail,
        response_id=attempt.response_id,
        request_id=attempt.request_id,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        cache_read_tokens=usage.cache_read_tokens,
        cache_write_tokens=usage.cache_write_tokens,
        reasoning_tokens=usage.reasoning_tokens,
        cost_usd=attempt.cost_usd,
        latency_ms=attempt.latency_ms,
        schema_name=attempt.schema_name,
        schema_hash=attempt.schema_hash,
        degraded=attempt.degraded,
        error_type=attempt.error_type,
        error_message=attempt.error_message,
        fallback_reason=attempt.fallback_reason,
        created_at=attempt.started_at,
    )


class DbCallRecorder:
    """Writes each attempt in its own short transaction, so a crashed run keeps its record.

    A failed write raises: a grade whose model calls weren't recorded would break the audit
    guarantee, so the run fails instead (and can be regraded). Also logs each attempt.
    """

    def __init__(
        self,
        run_id: Optional[UUID],
        submission_id: Optional[UUID],
        question_id: Optional[UUID] = None,
        exam_draft_id: Optional[UUID] = None,
    ):
        self.run_id = run_id
        self.submission_id = submission_id
        self.question_id = question_id
        self.exam_draft_id = exam_draft_id
        self._log = LogRecorder()

    def for_question(self, question_id: UUID) -> "DbCallRecorder":
        """Same run, calls attributed to one question (e.g. parsing its rubric during a run)."""
        return DbCallRecorder(self.run_id, self.submission_id, question_id)

    def record(self, attempt: AttemptRecord) -> None:
        self._log.record(attempt)
        with Session(engine) as db:
            db.add(to_row(attempt, self.run_id, self.submission_id, self.question_id, self.exam_draft_id))
            db.commit()
