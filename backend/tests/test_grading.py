"""Unit tests for graders (through the router), degraded-path JSON parsing and the per-run budget."""

import json

import pytest

from app.agents.graders.base_grader import GradingError
from app.agents.graders.math_grader import MathGrader
from app.llm import budget as llm_budget
from app.llm.schema import extract_json_object
from app.llm.types import LLMOutputInvalid
from app.schemas.grading import QuestionType, RubricCriteria, Subject, Triplet


@pytest.fixture
def triplet() -> Triplet:
    return Triplet(
        question_id="Q1",
        question_text="Solve for x: 2x + 5 = 15",
        question_type=QuestionType.PROBLEM,
        subject=Subject.MATH,
        candidate_answer="2x = 10, x = 5",
        expected_answer=RubricCriteria(question_id="Q1", expected_points=["Subtract 5", "Divide by 2"]),
        max_score=5,
    )


class TestExtractJsonObject:
    """Only used on the degraded (prompt-only) path for servers without schema support."""

    def test_plain(self):
        assert extract_json_object('{"a": 1}') == {"a": 1}

    def test_fenced(self):
        assert extract_json_object('```json\n{"a": 1}\n```') == {"a": 1}

    def test_surrounded_by_prose(self):
        assert extract_json_object('Here you go:\n{"a": {"b": 2}}\nThanks') == {"a": {"b": 2}}

    @pytest.mark.parametrize("text", ["", "no json here", "[1, 2]", "{broken"])
    def test_unusable(self, text):
        with pytest.raises(LLMOutputInvalid):
            extract_json_object(text)


class TestGrader:
    async def test_rubric_is_in_prompt(self, fake_llm, triplet):
        result = await MathGrader().grade(triplet)

        prompt = fake_llm.calls_of("grade")[0]["prompt"]
        assert "- Subtract 5" in prompt and "- Divide by 2" in prompt
        assert result.score == 2.5

    async def test_out_of_range_score_is_clamped(self, fake_llm, triplet):
        fake_llm.grade = lambda p: {"score": 9, "reasoning": "r", "feedback": "f", "confidence": 1}
        result = await MathGrader().grade(triplet)
        assert result.score == 5

    async def test_invalid_output_is_repaired_once(self, fake_llm, triplet):
        responses = iter([
            "not json",
            {"score": 3, "reasoning": "ok", "feedback": "", "confidence": 0.8},
        ])
        fake_llm.grade = lambda p: next(responses)
        result = await MathGrader().grade(triplet)

        assert result.score == 3
        grade_calls = fake_llm.calls_of("grade")
        assert len(grade_calls) == 2
        assert "did not match the required output schema" in grade_calls[1]["prompt"]

    @pytest.mark.parametrize(
        "bad",
        [
            "not json",
            json.dumps({"score": "five", "reasoning": "r", "feedback": "f", "confidence": 1}),
            json.dumps({"score": 2, "reasoning": "   ", "feedback": "f", "confidence": 1}),
            json.dumps({"score": 2}),
        ],
    )
    async def test_persistent_failure_raises_instead_of_scoring_zero(self, fake_llm, triplet, bad):
        fake_llm.grade = lambda p: bad
        with pytest.raises(GradingError):
            await MathGrader().grade(triplet)
        assert len(fake_llm.calls_of("grade")) == 2  # initial + one repair


class TestBudget:
    def test_call_budget_is_per_run(self):
        with llm_budget.budget(2):
            llm_budget.check_and_count_call()
            llm_budget.check_and_count_call()
            with pytest.raises(llm_budget.LLMBudgetExceeded):
                llm_budget.check_and_count_call()
        # A new run starts from zero
        with llm_budget.budget(1):
            llm_budget.check_and_count_call()

    def test_cost_budget(self):
        with llm_budget.budget(100, max_cost_usd=1.0):
            llm_budget.check_and_count_call()
            llm_budget.add_cost(1.5)
            with pytest.raises(llm_budget.LLMBudgetExceeded, match="cost"):
                llm_budget.check_and_count_call()

    def test_no_budget_means_unlimited(self):
        for _ in range(100):
            llm_budget.check_and_count_call()
