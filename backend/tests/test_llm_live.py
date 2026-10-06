"""Live smoke tests against real models. Skipped unless explicitly enabled:

    LIVE_ANTHROPIC=1 ANTHROPIC_API_KEY=sk-ant-... pytest -m live
    LIVE_OPENWEIGHT_BASE_URL=http://localhost:11434/v1 \\
        LIVE_OPENWEIGHT_MODEL=qwen3:4b-instruct-2507-q4_K_M pytest -m live

They make a handful of small calls per backend (a few cents at most for Claude; free locally).
"""

import os

import pytest

from app.agents.graders.math_grader import MathGrader
from app.agents.orchestrator import LangGraphOrchestrator
from app.llm.config import LLMSettings, RoleConfig, get_llm_settings
from app.llm.invoker import LangChainInvoker
from app.llm.recorder import recording_to
from app.llm.router import ModelRouter
from app.llm.types import CallContext, LLMRequest, Role, TextPart
from app.schemas.grading import QuestionType, RubricCriteria, Subject, Triplet
from tests.test_llm_router import Answer

# One event loop for the whole module, like a worker process (cached HTTP clients are loop-bound)
pytestmark = [pytest.mark.live, pytest.mark.asyncio(loop_scope="module")]

OPENWEIGHT_URL = os.environ.get("LIVE_OPENWEIGHT_BASE_URL")
OPENWEIGHT_MODEL = os.environ.get("LIVE_OPENWEIGHT_MODEL", "qwen3:4b-instruct-2507-q4_K_M")
needs_openweight = pytest.mark.skipif(not OPENWEIGHT_URL, reason="set LIVE_OPENWEIGHT_BASE_URL (+ _MODEL)")


def _request() -> LLMRequest[Answer]:
    return LLMRequest[Answer](
        role=Role.GRADER,
        system="You answer arithmetic questions.",
        parts=[TextPart(text="What is 6 * 7? Put the number in `value`.")],
        output_schema=Answer,
        context=CallContext(purpose="live_smoke"),
    )


def _triplet(answer: str) -> Triplet:
    return Triplet(
        question_id="Q1",
        question_text="Solve for x: 2x + 5 = 15. Show your steps.",
        question_type=QuestionType.PROBLEM,
        subject=Subject.MATH,
        candidate_answer=answer,
        expected_answer=RubricCriteria(
            question_id="Q1",
            expected_points=["Subtracts 5 from both sides (2x = 10)", "Divides by 2", "Final answer x = 5"],
        ),
        max_score=5,
    )


class AttemptList:
    def __init__(self):
        self.attempts = []

    def record(self, attempt):
        self.attempts.append(attempt)


@pytest.fixture
def openweight_roles(monkeypatch):
    """Point the text roles (grader, evaluator, rubric_parser) at the local open-weight model."""
    for role in ("GRADER", "EVALUATOR", "RUBRIC_PARSER"):
        monkeypatch.setenv(f"LLM__{role}__PROVIDER", "openweight")
        monkeypatch.setenv(f"LLM__{role}__MODEL", OPENWEIGHT_MODEL)
        monkeypatch.setenv(f"LLM__{role}__BASE_URL", OPENWEIGHT_URL or "")
        monkeypatch.setenv(f"LLM__{role}__SUPPORTS_VISION", "false")
    get_llm_settings.cache_clear()
    yield
    get_llm_settings.cache_clear()


# ===== Claude =====

@pytest.mark.skipif(os.environ.get("LIVE_ANTHROPIC") != "1", reason="set LIVE_ANTHROPIC=1 and ANTHROPIC_API_KEY")
async def test_claude_structured_output():
    settings = LLMSettings(grader=RoleConfig(provider="anthropic", model="claude-sonnet-5-5", effort="low",
                                             max_tokens=2000))
    result = await ModelRouter(LangChainInvoker(), settings).call(_request())
    assert result.parsed.value == 42
    assert result.attempts[0].response_id and result.attempts[0].cost_usd


# ===== Self-hosted open-weight (vLLM / SGLang / Ollama) =====

@needs_openweight
async def test_open_weight_structured_output():
    settings = LLMSettings(grader=RoleConfig(provider="openweight", model=OPENWEIGHT_MODEL,
                                             base_url=OPENWEIGHT_URL, max_tokens=2000))
    result = await ModelRouter(LangChainInvoker(), settings).call(_request())

    assert result.parsed.value == 42
    first = result.attempts[0]
    assert first.cost_usd == 0.0 and not first.external
    assert first.request["structured_output"] == "json_schema"  # server-side schema, not prompt-only


@needs_openweight
async def test_open_weight_grader_scores_correct_above_wrong(openweight_roles):
    seen = AttemptList()
    with recording_to(seen):
        correct = await MathGrader().grade(_triplet("2x + 5 = 15\n2x = 10\nx = 5"))
        wrong = await MathGrader().grade(_triplet("2x = 15 + 5\n2x = 20\nx = 10"))

    for result in (correct, wrong):
        assert 0 <= result.score <= 5 and result.reasoning
    assert correct.score > wrong.score, (correct, wrong)
    assert all(a.model_answered for a in seen.attempts)
    assert {a.model_requested for a in seen.attempts} == {OPENWEIGHT_MODEL}


@needs_openweight
async def test_open_weight_full_grading_graph(openweight_roles):
    """Tagger → subject grader → evaluator, all on the local model."""
    seen = AttemptList()
    with recording_to(seen):
        result = await LangGraphOrchestrator().grade_triplet(_triplet("2x = 10, so x = 5"))

    assert 0 <= result.score <= 5 and result.reasoning and result.feedback
    purposes = {a.context.purpose for a in seen.attempts}
    assert {"tag", "grade", "evaluate"} <= purposes
