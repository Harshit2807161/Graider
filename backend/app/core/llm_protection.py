"""Per-run LLM call budget (runaway-cost guard).

The budget is scoped to one grading run via a ContextVar, so concurrent submissions
in the same worker don't share a counter and a budget never outlives its run.
(The previous implementation was a single Redis counter shared by every submission
forever: after 40 calls in total, all future grading failed.)
"""

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Iterator, Optional

import structlog

logger = structlog.get_logger(__name__)


class LLMBudgetExceeded(RuntimeError):
    """Raised when a run tries to make more LLM calls than its budget allows."""


@dataclass
class _Budget:
    limit: int
    used: int = 0


_current_budget: ContextVar[Optional[_Budget]] = ContextVar("llm_call_budget", default=None)


class LLMUsageProtector:
    @contextmanager
    def budget(self, limit: int) -> Iterator[_Budget]:
        """Enforce `limit` LLM calls for everything executed inside this block."""
        token = _current_budget.set(_Budget(limit=limit))
        try:
            yield _current_budget.get()
        finally:
            _current_budget.reset(token)

    def check_and_increment(self) -> None:
        """Count one LLM call against the active budget; raise if it is exhausted.

        Calls made outside any budget block are not limited.
        """
        budget = _current_budget.get()
        if budget is None:
            return
        budget.used += 1
        if budget.used > budget.limit:
            logger.error("llm_budget_exceeded", used=budget.used, limit=budget.limit)
            raise LLMBudgetExceeded(
                f"LLM call budget exceeded ({budget.limit} calls for this submission). "
                "Raise LLM_MAX_CALLS_PER_SUBMISSION if this exam legitimately needs more."
            )

    def get_count(self) -> int:
        budget = _current_budget.get()
        return budget.used if budget else 0


protector = LLMUsageProtector()
