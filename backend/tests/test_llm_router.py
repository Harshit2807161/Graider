"""Router policy tests: fallback (open-weight ⇄ API), refusal, truncation, repair, budget, egress, audit."""

from collections import defaultdict
from typing import Any, Callable

import pytest
from pydantic import BaseModel, ConfigDict

from app.llm import budget as llm_budget
from app.llm.config import LLMSettings, RoleConfig
from app.llm.invoker import InvokeRequest, InvokeResponse
from app.llm.recorder import recording_to
from app.llm.router import ModelRouter
from app.llm.types import (
    AttemptRecord,
    CallContext,
    ImagePart,
    LLMAllTargetsFailed,
    LLMRequest,
    LLMTransportError,
    ModelTarget,
    Provider,
    Role,
    TextPart,
    Usage,
)

CLAUDE = {"provider": "anthropic", "model": "claude-sonnet-5-5"}
OPUS = {"provider": "anthropic", "model": "claude-opus-5-5"}
QWEN = {"provider": "openweight", "model": "Qwen/Qwen3-32B", "base_url": "http://vllm:8000/v1"}


class Answer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: int


GOOD = {"value": 42}


def ok(req: InvokeRequest, parsed: Any = GOOD) -> InvokeResponse:
    return InvokeResponse(
        text=str(parsed), parsed=parsed, model_answered=req.target.model,
        usage=Usage(input_tokens=1_000_000, output_tokens=100_000),
    )


def stopped(stop: str) -> Callable[[InvokeRequest], InvokeResponse]:
    return lambda req: InvokeResponse(text="", stop_reason=stop, refusal_detail="cyber" if stop == "refusal" else None,
                                      model_answered=req.target.model)


def invalid(req: InvokeRequest) -> InvokeResponse:
    return InvokeResponse(text='{"value": "x"}', parsed={"value": "not a number"}, model_answered=req.target.model)


class ScriptedInvoker:
    """Per model: a list of behaviours consumed in order (the last one repeats)."""

    def __init__(self, script: dict[str, list[Callable[[InvokeRequest], Any]]]):
        self.script = script
        self.requests: list[InvokeRequest] = []
        self._pos: dict[str, int] = defaultdict(int)

    async def invoke(self, req: InvokeRequest) -> InvokeResponse:
        self.requests.append(req)
        steps = self.script[req.target.model]
        step = steps[min(self._pos[req.target.model], len(steps) - 1)]
        self._pos[req.target.model] += 1
        out = step(req)
        if isinstance(out, BaseException):
            raise out
        return out


def settings_with(primary: dict, *fallbacks: dict, **overrides) -> LLMSettings:
    grader = RoleConfig(**primary, fallbacks=[ModelTarget(**f) for f in fallbacks])
    return LLMSettings(grader=grader, vision=RoleConfig(**primary, fallbacks=[ModelTarget(**f) for f in fallbacks]),
                       **overrides)


def request(role: Role = Role.GRADER, images: bool = False, **kw) -> LLMRequest[Answer]:
    parts: list = [TextPart(text="question")]
    if images:
        parts.append(ImagePart(data="aGVsbG8=", media_type="image/png", ref="page_000.png"))
    return LLMRequest[Answer](
        role=role, system="sys", parts=parts, output_schema=Answer, context=CallContext(purpose="test"), **kw
    )


async def call(router: ModelRouter, req=None):
    return await router.call(req or request())


async def test_primary_success():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [ok]})
    result = await call(ModelRouter(inv, settings_with(CLAUDE)))

    assert result.parsed == Answer(value=42)
    assert not result.fallback_used
    assert [a.attempt_kind for a in result.attempts] == ["initial"]


async def test_open_weight_primary_falls_back_to_claude_on_transport_error():
    inv = ScriptedInvoker({
        "Qwen/Qwen3-32B": [lambda r: LLMTransportError("ConnectError: vllm down")],
        "claude-sonnet-5-5": [ok],
    })
    result = await call(ModelRouter(inv, settings_with(QWEN, CLAUDE)))

    assert result.fallback_used and result.model_answered == "claude-sonnet-5-5"
    assert "transport_error" in result.fallback_reason
    first, second = result.attempts
    assert (first.provider, first.external, first.error_type) == (Provider.OPENWEIGHT, False, "LLMTransportError")
    assert (second.attempt_kind, second.external) == ("fallback", True)


async def test_claude_primary_falls_back_to_open_weight():
    inv = ScriptedInvoker({
        "claude-sonnet-5-5": [lambda r: LLMTransportError("AuthenticationError: invalid x-api-key")],
        "Qwen/Qwen3-32B": [ok],
    })
    result = await call(ModelRouter(inv, settings_with(CLAUDE, QWEN)))

    assert result.model_answered == "Qwen/Qwen3-32B"
    assert result.attempts[-1].cost_usd == 0.0  # self-hosted


async def test_refusal_moves_to_next_target():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [stopped("refusal")], "claude-opus-5-5": [ok]})
    result = await call(ModelRouter(inv, settings_with(CLAUDE, OPUS)))

    assert result.model_answered == "claude-opus-5-5"
    assert result.attempts[0].stop_reason == "refusal"
    assert "refusal" in result.fallback_reason


async def test_truncation_retries_once_with_more_tokens():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [stopped("max_tokens"), ok]})
    result = await call(ModelRouter(inv, settings_with({**CLAUDE, "max_tokens": 1000})))

    assert [a.attempt_kind for a in result.attempts] == ["initial", "truncation_retry"]
    assert [r.max_tokens for r in inv.requests] == [1000, 2000]


async def test_repeated_truncation_moves_to_next_target():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [stopped("max_tokens")], "claude-opus-5-5": [ok]})
    result = await call(ModelRouter(inv, settings_with(CLAUDE, OPUS)))

    assert result.model_answered == "claude-opus-5-5"
    assert "truncated" in result.fallback_reason


async def test_invalid_output_gets_one_repair_with_the_errors():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [invalid, ok]})
    result = await call(ModelRouter(inv, settings_with(CLAUDE)))

    assert [a.attempt_kind for a in result.attempts] == ["initial", "repair"]
    repair_prompt = inv.requests[1].parts[-1].text
    assert "did not match the required output schema" in repair_prompt and "value" in repair_prompt


async def test_all_targets_failing_raises_with_every_attempt():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [invalid], "Qwen/Qwen3-32B": [stopped("refusal")]})
    with pytest.raises(LLMAllTargetsFailed) as exc:
        await call(ModelRouter(inv, settings_with(CLAUDE, QWEN)))

    assert len(exc.value.attempts) == 3  # initial + repair on Claude, initial on Qwen
    assert "invalid_output" in exc.value.reasons[0] and "refusal" in exc.value.reasons[1]


async def test_budget_exhaustion_is_not_a_fallback():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [invalid], "claude-opus-5-5": [ok]})
    with llm_budget.budget(1), pytest.raises(llm_budget.LLMBudgetExceeded):
        await call(ModelRouter(inv, settings_with(CLAUDE, OPUS)))
    assert len(inv.requests) == 1


async def test_exclusions_apply_to_fallbacks_only():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [lambda r: LLMTransportError("down")], "claude-opus-5-5": [ok]})
    router = ModelRouter(inv, settings_with(CLAUDE, OPUS))

    with pytest.raises(LLMAllTargetsFailed):
        await router.call(request(exclude_models=frozenset({"claude-opus-5-5"})))
    # Excluding the primary's own model never empties the chain
    result = await ModelRouter(ScriptedInvoker({"claude-sonnet-5-5": [ok]}), settings_with(CLAUDE)).call(
        request(exclude_models=frozenset({"claude-sonnet-5-5"}))
    )
    assert result.model_answered == "claude-sonnet-5-5"


async def test_external_fallback_can_be_disallowed_for_self_hosted_primary():
    inv = ScriptedInvoker({"Qwen/Qwen3-32B": [lambda r: LLMTransportError("down")], "claude-sonnet-5-5": [ok]})
    router = ModelRouter(inv, settings_with(QWEN, CLAUDE, allow_external_fallback=False))

    with pytest.raises(LLMAllTargetsFailed):
        await call(router)
    assert {r.target.model for r in inv.requests} == {"Qwen/Qwen3-32B"}


async def test_image_requests_skip_text_only_targets():
    text_only = {**QWEN, "supports_vision": False}
    inv = ScriptedInvoker({"claude-sonnet-5-5": [ok]})
    grader = RoleConfig(**text_only, fallbacks=[ModelTarget(**CLAUDE)])
    router = ModelRouter(inv, LLMSettings(grader=grader))

    result = await router.call(request(images=True))
    assert result.model_answered == "claude-sonnet-5-5" and not result.fallback_used


async def test_cost_and_degraded_flag_are_recorded():
    seen: list[AttemptRecord] = []

    class ListRecorder:
        def record(self, attempt):
            seen.append(attempt)

    prompted_qwen = {**QWEN, "supports_json_schema": False}
    inv = ScriptedInvoker({"claude-sonnet-5-5": [stopped("refusal")], "Qwen/Qwen3-32B": [ok]})
    with recording_to(ListRecorder()):
        await call(ModelRouter(inv, settings_with(CLAUDE, prompted_qwen)))

    assert [a.model_requested for a in seen] == ["claude-sonnet-5-5", "Qwen/Qwen3-32B"]
    assert seen[1].degraded and seen[1].cost_usd == 0.0
    assert seen[1].schema_name == "Answer" and seen[1].schema_hash


async def test_claude_cost_from_usage():
    inv = ScriptedInvoker({"claude-sonnet-5-5": [ok]})  # 1M input + 100k output tokens
    result = await call(ModelRouter(inv, settings_with(CLAUDE)))
    assert result.cost_usd == pytest.approx(2.0 + 1.0)  # $2/MTok in, $10/MTok out


def test_vision_role_rejects_text_only_targets():
    with pytest.raises(ValueError, match="supports_vision"):
        LLMSettings(vision=RoleConfig(**QWEN, supports_vision=False))


def test_independence_warning_when_grader_and_evaluator_share_model(monkeypatch):
    from app.llm import router as router_mod

    same = LLMSettings(grader=RoleConfig(**CLAUDE), evaluator=RoleConfig(**CLAUDE))
    assert len(same.independence_warnings()) == 1
    different = LLMSettings(grader=RoleConfig(**CLAUDE), evaluator=RoleConfig(**OPUS))
    assert different.independence_warnings() == []

    calls: list[dict] = []
    monkeypatch.setattr(router_mod.logger, "warning", lambda event, **kw: calls.append(kw))
    monkeypatch.setattr(router_mod, "_independence_checked", False)
    router_mod.warn_independence_once(same)
    router_mod.warn_independence_once(same)
    assert len(calls) == 1
