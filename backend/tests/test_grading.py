"""Unit tests for LLM output handling, graders and the per-run call budget."""

import json

import pytest

from app.agents.graders.base_grader import GradingError
from app.agents.graders.math_grader import MathGrader
from app.core.llm_protection import LLMBudgetExceeded, protector
from app.core.llm_provider import LLMResponseError, extract_json_object
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
    def test_plain(self):
        assert extract_json_object('{"a": 1}') == {"a": 1}

    def test_fenced(self):
        assert extract_json_object('```json\n{"a": 1}\n```') == {"a": 1}

    def test_surrounded_by_prose(self):
        assert extract_json_object('Here you go:\n{"a": {"b": 2}}\nThanks') == {"a": {"b": 2}}

    @pytest.mark.parametrize("text", ["", "no json here", "[1, 2]", "{broken"])
    def test_unusable(self, text):
        with pytest.raises(LLMResponseError):
            extract_json_object(text)


class TestGrader:
    async def test_rubric_is_in_prompt(self, fake_llm, triplet):
        result = await MathGrader().grade(triplet)

        prompt = fake_llm.calls_of("grade")[0]["prompt"]
        assert "- Subtract 5" in prompt and "- Divide by 2" in prompt
        assert result.score == 2.5

    async def test_out_of_range_score_is_clamped(self, fake_llm, triplet):
        fake_llm.grade = lambda p: json.dumps({"score": 9, "reasoning": "r", "feedback": "f", "confidence": 1})
        result = await MathGrader().grade(triplet)
        assert result.score == 5

    async def test_retries_once_after_unusable_output(self, fake_llm, triplet):
        responses = iter(["not json", json.dumps({"score": 3, "reasoning": "ok", "confidence": 0.8})])
        fake_llm.grade = lambda p: next(responses)
        result = await MathGrader().grade(triplet)
        assert result.score == 3
        assert len(fake_llm.calls_of("grade")) == 2

    @pytest.mark.parametrize("bad", ["not json", '{"score": "five", "reasoning": "r"}', '{"score": 2}'])
    async def test_persistent_failure_raises_instead_of_scoring_zero(self, fake_llm, triplet, bad):
        fake_llm.grade = lambda p: bad
        with pytest.raises(GradingError):
            await MathGrader().grade(triplet)


class TestBudget:
    def test_budget_is_per_run(self):
        with protector.budget(2):
            protector.check_and_increment()
            protector.check_and_increment()
            with pytest.raises(LLMBudgetExceeded):
                protector.check_and_increment()
        # A new run starts from zero
        with protector.budget(1):
            protector.check_and_increment()

    def test_no_budget_means_unlimited(self):
        for _ in range(100):
            protector.check_and_increment()
