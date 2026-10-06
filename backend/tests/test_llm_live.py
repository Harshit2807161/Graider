"""Live smoke tests against real models. Skipped unless explicitly enabled:

    LIVE_ANTHROPIC=1 ANTHROPIC_API_KEY=sk-ant-... pytest -m live
    LIVE_OPENWEIGHT_BASE_URL=http://localhost:11434/v1 LIVE_OPENWEIGHT_MODEL=qwen3:8b pytest -m live

They make one small structured-output call per backend (a few cents at most for Claude).
"""

import os

import pytest

from app.llm.config import LLMSettings, RoleConfig
from app.llm.router import ModelRouter
from app.llm.invoker import LangChainInvoker
from app.llm.types import CallContext, LLMRequest, Role, TextPart
from tests.test_llm_router import Answer

pytestmark = pytest.mark.live


def _request() -> LLMRequest[Answer]:
    return LLMRequest[Answer](
        role=Role.GRADER,
        system="You answer arithmetic questions.",
        parts=[TextPart(text="What is 6 * 7? Put the number in `value`.")],
        output_schema=Answer,
        context=CallContext(purpose="live_smoke"),
    )


@pytest.mark.skipif(os.environ.get("LIVE_ANTHROPIC") != "1", reason="set LIVE_ANTHROPIC=1 and ANTHROPIC_API_KEY")
async def test_claude_structured_output():
    settings = LLMSettings(grader=RoleConfig(provider="anthropic", model="claude-sonnet-5-5", effort="low",
                                             max_tokens=2000))
    result = await ModelRouter(LangChainInvoker(), settings).call(_request())
    assert result.parsed.value == 42
    assert result.attempts[0].response_id and result.attempts[0].cost_usd


@pytest.mark.skipif(not os.environ.get("LIVE_OPENWEIGHT_BASE_URL"), reason="set LIVE_OPENWEIGHT_BASE_URL (+ _MODEL)")
async def test_open_weight_structured_output():
    settings = LLMSettings(grader=RoleConfig(
        provider="openweight",
        model=os.environ.get("LIVE_OPENWEIGHT_MODEL", "Qwen/Qwen3-8B"),
        base_url=os.environ["LIVE_OPENWEIGHT_BASE_URL"],
        max_tokens=2000,
    ))
    result = await ModelRouter(LangChainInvoker(), settings).call(_request())
    assert result.parsed.value == 42
    assert result.attempts[0].cost_usd == 0.0
