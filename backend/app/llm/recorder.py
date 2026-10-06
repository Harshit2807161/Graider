"""Where attempt records go. M3 adds a database recorder (the `llm_calls` audit table)."""

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Iterator, Protocol

import structlog

from app.llm.types import AttemptRecord

logger = structlog.get_logger(__name__)


class CallRecorder(Protocol):
    def record(self, attempt: AttemptRecord) -> None: ...


class NullRecorder:
    def record(self, attempt: AttemptRecord) -> None:
        return None


class LogRecorder:
    """Default: one structured log line per attempt (no prompts or outputs in logs)."""

    def record(self, attempt: AttemptRecord) -> None:
        logger.info(
            "llm_call",
            role=attempt.role.value,
            purpose=attempt.context.purpose,
            question_id=attempt.context.question_id,
            attempt_no=attempt.attempt_no,
            attempt_kind=attempt.attempt_kind,
            provider=attempt.provider.value,
            model_requested=attempt.model_requested,
            model_answered=attempt.model_answered,
            external=attempt.external,
            stop_reason=attempt.stop_reason,
            input_tokens=attempt.usage.input_tokens,
            output_tokens=attempt.usage.output_tokens,
            cost_usd=attempt.cost_usd,
            latency_ms=attempt.latency_ms,
            degraded=attempt.degraded,
            error_type=attempt.error_type,
            fallback_reason=attempt.fallback_reason,
        )


_current: ContextVar[CallRecorder] = ContextVar("llm_call_recorder", default=LogRecorder())


@contextmanager
def recording_to(recorder: CallRecorder) -> Iterator[CallRecorder]:
    token = _current.set(recorder)
    try:
        yield recorder
    finally:
        _current.reset(token)


def record(attempt: AttemptRecord) -> None:
    # Errors propagate: if the audit record can't be written, the call (and run) must fail
    _current.get().record(attempt)
