"""Model router: the single entry point for every LLM call.

For a request it walks the role's chain (pinned primary, then fallbacks) and, per target:
  budget check → invoke → refusal ⇒ next target
                        → truncated ⇒ one retry with more tokens ⇒ next target
                        → invalid output ⇒ one repair request ⇒ next target
                        → transport/config error ⇒ next target
Every attempt is recorded (see recorder.py). If all targets fail: LLMAllTargetsFailed.
"""

from __future__ import annotations

import json
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Iterator, Optional, TypeVar

import structlog
from pydantic import BaseModel, ValidationError

from app.llm import budget as budget_mod
from app.llm import recorder
from app.llm.config import LLMSettings, get_llm_settings
from app.llm.costs import cost_usd
from app.llm.invoker import InvokeRequest, InvokeResponse, Invoker, LangChainInvoker
from app.llm.schema import portable_schema, schema_hash
from app.llm.types import (
    AttemptKind,
    AttemptRecord,
    LLMAllTargetsFailed,
    LLMOutputInvalid,
    LLMRefusal,
    LLMRequest,
    LLMResult,
    LLMTargetError,
    LLMTransportError,
    LLMTruncated,
    ModelTarget,
    TextPart,
)

logger = structlog.get_logger(__name__)

S = TypeVar("S", bound=BaseModel)

# Truncated responses get one retry with this many times the tokens, up to the cap
TRUNCATION_RETRY_FACTOR = 2
MAX_TOKENS_CAP = 32000


class ModelRouter:
    def __init__(self, invoker: Invoker, settings: Optional[LLMSettings] = None):
        self.invoker = invoker
        self.settings = settings or get_llm_settings()

    # ----- chain -----

    def chain_for(self, request: LLMRequest) -> list[ModelTarget]:
        role_cfg = self.settings.role(request.role)
        primary, *fallbacks = role_cfg.chain
        # Exclusions apply to fallbacks only (e.g. a grader fallback must never be the evaluator's model)
        chain = [primary, *(t for t in fallbacks if t.model not in request.exclude_models)]
        if request.has_images:
            chain = [t for t in chain if t.supports_vision]
        primary_internal = bool(chain) and not chain[0].is_external
        if primary_internal and not self.settings.allow_external_fallback:
            chain = [chain[0]] + [t for t in chain[1:] if not t.is_external]
        return chain

    # ----- public API -----

    async def call(self, request: LLMRequest[S]) -> LLMResult[S]:
        chain = self.chain_for(request)
        if not chain:
            raise LLMAllTargetsFailed(request.role, [], ["no eligible target (check config/exclusions)"])

        json_schema = portable_schema(request.output_schema)
        attempts: list[AttemptRecord] = []
        reasons: list[str] = []
        fallback_reason: Optional[str] = None

        for index, target in enumerate(chain):
            try:
                parsed = await self._call_target(
                    request, target, json_schema, attempts,
                    first_kind="initial" if index == 0 else "fallback",
                    fallback_reason=fallback_reason,
                )
            except LLMTargetError as e:
                fallback_reason = f"{target.model}: {e.reason}: {e}"[:500]
                reasons.append(fallback_reason)
                logger.warning(
                    "llm_target_failed",
                    role=request.role.value,
                    purpose=request.context.purpose,
                    model=target.model,
                    reason=e.reason,
                    error=str(e)[:200],
                    next_target=chain[index + 1].model if index + 1 < len(chain) else None,
                )
                continue

            return LLMResult[request.output_schema](
                parsed=parsed,
                target=target,
                model_answered=attempts[-1].model_answered,
                attempts=attempts,
                fallback_used=index > 0,
                fallback_reason=fallback_reason if index > 0 else None,
            )

        raise LLMAllTargetsFailed(request.role, attempts, reasons)

    # ----- per target -----

    async def _call_target(
        self,
        request: LLMRequest[S],
        target: ModelTarget,
        json_schema: dict[str, Any],
        attempts: list[AttemptRecord],
        first_kind: AttemptKind,
        fallback_reason: Optional[str],
    ) -> S:
        max_tokens = request.max_tokens or target.max_tokens
        resp = await self._attempt(
            request, target, json_schema, request.parts, max_tokens, attempts, first_kind, fallback_reason
        )

        if resp.stop_reason == "max_tokens":
            bigger = min(max_tokens * TRUNCATION_RETRY_FACTOR, MAX_TOKENS_CAP)
            if bigger <= max_tokens:
                raise LLMTruncated(f"output truncated at {max_tokens} tokens")
            resp = await self._attempt(
                request, target, json_schema, request.parts, bigger, attempts, "truncation_retry", None
            )
            if resp.stop_reason == "max_tokens":
                raise LLMTruncated(f"output truncated at {bigger} tokens after retry")
        if resp.stop_reason == "refusal":
            raise LLMRefusal(resp.refusal_detail or "model declined the request")

        parsed, error = self._validate(request, resp)
        if parsed is not None:
            return parsed

        # One repair request: fresh request with the validation errors and the previous output
        repair_parts = [
            *request.parts,
            TextPart(
                text=(
                    "Your previous response did not match the required output schema.\n"
                    f"Validation errors:\n{error}\n\n"
                    f"Previous response:\n{(resp.text or '')[:4000]}\n\n"
                    "Return a corrected response that satisfies the schema."
                )
            ),
        ]
        resp = await self._attempt(
            request, target, json_schema, repair_parts, max_tokens, attempts, "repair", None
        )
        if resp.stop_reason == "refusal":
            raise LLMRefusal(resp.refusal_detail or "model declined the repair request")
        if resp.stop_reason == "max_tokens":
            raise LLMTruncated("repair output truncated")
        parsed, error = self._validate(request, resp)
        if parsed is not None:
            return parsed
        raise LLMOutputInvalid(f"output invalid after repair: {error}")

    def _validate(self, request: LLMRequest[S], resp: InvokeResponse) -> tuple[Optional[S], Optional[str]]:
        if resp.parsed is None:
            return None, resp.parse_error or "no structured output returned"
        try:
            return request.output_schema.model_validate(resp.parsed), None
        except ValidationError as e:
            return None, json.dumps(e.errors(include_url=False, include_context=False), default=str)[:2000]

    async def _attempt(
        self,
        request: LLMRequest[S],
        target: ModelTarget,
        json_schema: dict[str, Any],
        parts: list,
        max_tokens: int,
        attempts: list[AttemptRecord],
        kind: AttemptKind,
        fallback_reason: Optional[str],
    ) -> InvokeResponse:
        budget_mod.check_and_count_call()  # raises LLMBudgetExceeded: not caught by the chain

        base = dict(
            role=request.role,
            context=request.context,
            attempt_no=len(attempts) + 1,
            attempt_kind=kind,
            provider=target.provider,
            model_requested=target.model,
            base_url=target.base_url,
            external=target.is_external,
            model_revision=target.model_revision,
            quantization=target.quantization,
            schema_name=request.schema_name,
            schema_hash=schema_hash(json_schema),
            degraded=not target.supports_json_schema,
            fallback_reason=fallback_reason,
        )
        context = request.context
        trace_metadata = {
            "role": request.role.value,
            "purpose": context.purpose,
            "question": context.question_id or "",
            "round": "" if context.round is None else str(context.round),
            "attempt_kind": kind,
            "model_requested": target.model,
            "fallback_reason": fallback_reason or "",
        }
        invoke_request = InvokeRequest(
            target=target,
            system=request.system,
            parts=parts,
            json_schema=json_schema,
            max_tokens=max_tokens,
            trace_name=f"{request.role.value}.{context.purpose}",
            trace_metadata={k: v for k, v in trace_metadata.items() if v},
        )
        try:
            resp = await self.invoker.invoke(invoke_request)
        except LLMTargetError as e:
            attempt = AttemptRecord(
                **base,
                request={"model": target.model, "max_tokens": max_tokens},
                stop_reason="error",
                error_type=type(e).__name__,
                error_message=str(e)[:2000],
            )
            attempts.append(attempt)
            recorder.record(attempt)
            raise
        except Exception as e:  # unexpected invoker bug: record and treat as transport failure
            attempt = AttemptRecord(
                **base,
                request={"model": target.model, "max_tokens": max_tokens},
                stop_reason="error",
                error_type=type(e).__name__,
                error_message=str(e)[:2000],
            )
            attempts.append(attempt)
            recorder.record(attempt)
            raise LLMTransportError(f"{type(e).__name__}: {e}") from e

        cost = cost_usd(target, resp.usage)
        budget_mod.add_cost(cost)
        attempt = AttemptRecord(
            **base,
            model_answered=resp.model_answered,
            request=resp.request,
            response_raw=resp.raw,
            parsed=resp.parsed,
            stop_reason=resp.stop_reason,
            provider_stop_reason=resp.provider_stop_reason,
            refusal_detail=resp.refusal_detail,
            response_id=resp.response_id,
            request_id=resp.request_id,
            usage=resp.usage,
            cost_usd=cost,
            latency_ms=resp.latency_ms,
            error_type="OutputInvalid" if resp.parse_error else None,
            error_message=resp.parse_error,
        )
        attempts.append(attempt)
        recorder.record(attempt)
        return resp


# ===== per-run router =====

_current_router: ContextVar[Optional[ModelRouter]] = ContextVar("model_router", default=None)
_invoker_factory = LangChainInvoker


def set_invoker_factory(factory) -> None:
    """Tests replace the real LangChain invoker with a fake."""
    global _invoker_factory
    _invoker_factory = factory


@contextmanager
def run_router(settings: Optional[LLMSettings] = None) -> Iterator[ModelRouter]:
    """One router (and one set of chat-model clients) per grading run."""
    router = ModelRouter(_invoker_factory(), settings)
    token = _current_router.set(router)
    try:
        yield router
    finally:
        _current_router.reset(token)


_independence_checked = False


def warn_independence_once(settings: LLMSettings) -> None:
    """Log the grader/evaluator independence warnings, once per process."""
    global _independence_checked
    if _independence_checked:
        return
    _independence_checked = True
    for message in settings.independence_warnings():
        logger.warning("llm_independence_warning", detail=message)


def get_router() -> ModelRouter:
    """The current run's router, or a fresh one outside a run (scripts, unit tests)."""
    current = _current_router.get()
    if current is not None:
        return current
    warn_independence_once(get_llm_settings())
    return ModelRouter(_invoker_factory())
