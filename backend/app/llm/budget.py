"""Per-run LLM budget (runaway-cost guard): a cap on calls and on USD.

Scoped to one grading run via a ContextVar, so concurrent runs in one worker don't share a
counter. Child asyncio tasks (e.g. LangGraph fan-out) copy the context and share the same
mutable budget object, so all calls of a run count against one budget.
"""

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Iterator, Optional

import structlog

from app.llm.types import LLMError

logger = structlog.get_logger(__name__)


class LLMBudgetExceeded(LLMError):
    """The run hit its call or cost cap. Not retried, not a fallback trigger."""


@dataclass
class Budget:
    max_calls: int
    max_cost_usd: Optional[float] = None
    calls: int = 0
    cost_usd: float = 0.0


_current: ContextVar[Optional[Budget]] = ContextVar("llm_budget", default=None)


@contextmanager
def budget(max_calls: int, max_cost_usd: Optional[float] = None) -> Iterator[Budget]:
    """Enforce caps for everything executed inside this block."""
    token = _current.set(Budget(max_calls=max_calls, max_cost_usd=max_cost_usd))
    try:
        yield _current.get()
    finally:
        _current.reset(token)


def current_budget() -> Optional[Budget]:
    return _current.get()


def check_and_count_call() -> None:
    """Count one call against the active budget; raise if a cap is already reached.

    Calls made outside any budget block are not limited (e.g. unit tests, one-off scripts).
    """
    b = _current.get()
    if b is None:
        return
    if b.max_cost_usd is not None and b.cost_usd >= b.max_cost_usd:
        logger.error("llm_cost_budget_exceeded", cost_usd=b.cost_usd, limit=b.max_cost_usd)
        raise LLMBudgetExceeded(
            f"LLM cost budget exceeded (${b.cost_usd:.2f} of ${b.max_cost_usd:.2f} for this submission)."
        )
    b.calls += 1
    if b.calls > b.max_calls:
        logger.error("llm_call_budget_exceeded", calls=b.calls, limit=b.max_calls)
        raise LLMBudgetExceeded(
            f"LLM call budget exceeded ({b.max_calls} calls for this submission). "
            "Raise LLM__MAX_CALLS_BASE / LLM__MAX_CALLS_PER_QUESTION if this exam needs more."
        )


def add_cost(cost_usd: Optional[float]) -> None:
    b = _current.get()
    if b is not None and cost_usd:
        b.cost_usd += cost_usd
