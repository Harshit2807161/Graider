"""Degraded-path JSON parsing and the per-run call/cost budget (grading itself: test_grading_v2.py)."""

import pytest

from app.llm import budget as llm_budget
from app.llm.schema import extract_json_object
from app.llm.types import LLMOutputInvalid


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
