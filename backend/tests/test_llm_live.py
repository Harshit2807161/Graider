"""Live smoke tests against real models. Skipped unless explicitly enabled:

    LIVE_ANTHROPIC=1 ANTHROPIC_API_KEY=sk-ant-... pytest -m live
    LIVE_OPENWEIGHT_BASE_URL=http://localhost:11434/v1 \\
        LIVE_OPENWEIGHT_MODEL=qwen3:4b-instruct-2507-q4_K_M \\
        LIVE_OPENWEIGHT_VISION_MODEL=qwen3-vl:4b-instruct-q4_K_M pytest -m live

They make a handful of small calls per backend (a few cents at most for Claude; free locally).
"""

import os
import unicodedata
from pathlib import Path

import pytest
from PIL import Image, ImageDraw, ImageFont

from app.agents.graders.math_grader import MathGrader
from app.agents.orchestrator import LangGraphOrchestrator
from app.llm.config import LLMSettings, RoleConfig, get_llm_settings
from app.llm.invoker import LangChainInvoker
from app.llm.recorder import recording_to
from app.llm.router import ModelRouter
from app.llm.types import CallContext, LLMRequest, Role, TextPart
from app.schemas.grading import Question, QuestionType, RubricCriteria, Subject, Triplet
from app.services.ocr_service import OCRService
from tests.test_llm_router import Answer

# One event loop for the whole module, like a worker process (cached HTTP clients are loop-bound)
pytestmark = [pytest.mark.live, pytest.mark.asyncio(loop_scope="module")]

OPENWEIGHT_URL = os.environ.get("LIVE_OPENWEIGHT_BASE_URL")
OPENWEIGHT_MODEL = os.environ.get("LIVE_OPENWEIGHT_MODEL", "qwen3:4b-instruct-2507-q4_K_M")
OPENWEIGHT_VISION_MODEL = os.environ.get("LIVE_OPENWEIGHT_VISION_MODEL")
needs_openweight = pytest.mark.skipif(not OPENWEIGHT_URL, reason="set LIVE_OPENWEIGHT_BASE_URL (+ _MODEL)")
needs_openweight_vision = pytest.mark.skipif(
    not (OPENWEIGHT_URL and OPENWEIGHT_VISION_MODEL), reason="set LIVE_OPENWEIGHT_BASE_URL and _VISION_MODEL"
)
HANDWRITING_FONT = Path("/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf")  # ships with macOS


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


def _answer_sheet(path: Path) -> Path:
    """Render a small answer sheet in a handwriting-style font (falls back to the default font)."""
    lines = ["1)  2x + 5 = 15", "     2x = 10", "     x = 5", "", "2)  Plants take in carbon dioxide."]
    try:
        font = ImageFont.truetype(str(HANDWRITING_FONT), 44)
    except OSError:
        font = ImageFont.load_default(size=44)
    image = Image.new("RGB", (900, 520), "white")
    draw = ImageDraw.Draw(image)
    for i, line in enumerate(lines):
        draw.text((40, 30 + i * 90), line, fill=(20, 20, 60), font=font)
    image.save(path)
    return path


@needs_openweight_vision
async def test_open_weight_ocr_reads_answer_sheet(monkeypatch, tmp_path):
    monkeypatch.setenv("LLM__VISION__PROVIDER", "openweight")
    monkeypatch.setenv("LLM__VISION__MODEL", OPENWEIGHT_VISION_MODEL)
    monkeypatch.setenv("LLM__VISION__BASE_URL", OPENWEIGHT_URL)
    get_llm_settings.cache_clear()
    questions = [
        Question(id="Q1", text="Solve for x: 2x + 5 = 15", max_score=4),
        Question(id="Q2", text="Which gas do plants take in for photosynthesis?", max_score=2),
    ]
    try:
        answers = await OCRService().extract_answers(_answer_sheet(tmp_path / "sheet.png"), questions)
    finally:
        get_llm_settings.cache_clear()

    # Smoke check: answers read and placed under the right question. Small VLMs add diacritics
    # to handwriting-style letters (e.g. "díoxído"), so compare without accents.
    by_id = {a.question_id: _plain(a.text) for a in answers}
    assert set(by_id) == {"Q1", "Q2"}, answers
    assert "x = 5" in by_id["Q1"].replace("x=5", "x = 5"), answers
    assert "carbon dioxide" in by_id["Q2"], answers


def _plain(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)).lower()



# ===== rubric parser =====

RUBRIC_CASES = [
    # (question, type, max score, rubric, expectations)
    ("Which planet is the largest? (A) Earth (B) Jupiter (C) Mars (D) Venus", "mcq", 1, "B",
     {"kind": "pass_fail", "points": [1]}),
    ("Calculate the area of a rectangle that is 4 cm by 6 cm.", "problem", 3,
     "Uses length x width (1 mark)\nCorrect working 4 x 6 (1 mark)\nAnswer 24 cm² (1 mark)",
     {"kind": "criteria", "points": [1, 1, 1]}),
    ("Describe two causes of World War I.", "descriptive", 4, "Militarism\nThe alliance system",
     {"kind": "criteria", "points": [2, 2]}),
    # The rubric's marks add up to 4, not 5: keep them and let the checks flag it (never fudge)
    ("Define a renewable resource and give an example.", "descriptive", 5, "Definition (2)\nExample (2)",
     {"kind": "criteria", "points": [2, 2], "invalid": True}),
    ("What is the capital of France?", "descriptive", 1, None, {"derived": True}),
    # Prose with levels of credit for one point: one criterion, lower level in its notes (not 4 + 2)
    ("Explain how vaccines protect the body from disease.", "descriptive", 4,
     "Full marks if the student explains that a vaccine exposes the immune system to a harmless form of the "
     "pathogen and that memory cells allow a faster response later. Give half marks if they only say it 'makes "
     "you immune' without explaining how.",
     {"kind": "criteria", "points": [4], "notes": "2 of 4"}),
    # Terse shorthand: method and answer marks in one line
    ("Find the area of a circle with radius 3 cm.", "problem", 2,
     "A = πr² = 9π ≈ 28.3 cm². Method 1, answer 1. Accept 28.27 or 9π.",
     {"kind": "criteria", "points": [1, 1]}),
]


@needs_openweight
@pytest.mark.parametrize("question, qtype, max_score, rubric, expect", RUBRIC_CASES)
async def test_open_weight_rubric_parser(openweight_roles, question, qtype, max_score, rubric, expect):
    from app.rubrics.parser import parse_rubric

    result = await parse_rubric(question_text=question, rubric_text=rubric, max_score=max_score, question_type=qtype)

    spec = result.spec
    assert spec.derived is expect.get("derived", False)
    if "kind" in expect:
        assert spec.kind == expect["kind"], spec
    if "points" in expect:
        assert sorted(c.points for c in spec.criteria) == expect["points"], spec
    if "notes" in expect:  # partial credit converted to exact points
        assert expect["notes"] in " ".join(c.notes or "" for c in spec.criteria), spec
    if expect.get("invalid"):
        assert any("add up to 4" in e for e in result.errors), result.errors
    else:
        assert result.errors == [], (result.errors, spec)
