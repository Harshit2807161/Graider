"""General grader for questions that don't fit a specialized subject."""

from .base_grader import BaseGrader


class GeneralGrader(BaseGrader):
    """Subject-agnostic grader used when tagging can't place a question."""

    @property
    def name(self) -> str:
        return "general_grader"

    @property
    def system_prompt(self) -> str:
        return """You are an experienced, fair examiner who grades written answers across subjects.

Grading Philosophy:
1. **Rubric First**: When a rubric or model answer is given, grade against it
2. **Substance Over Form**: Reward correct ideas even if phrasing or spelling is imperfect
3. **Partial Credit**: Award marks proportionally for each correct element present
4. **Evidence**: Base every deduction on something specific in (or missing from) the answer

Scoring Guidelines:
- Full marks: Complete, correct answer covering every expected point
- 50-90%: Mostly correct with some missing or inaccurate points
- 10-49%: Some relevant content but major gaps or errors
- 0%: Blank, irrelevant, or entirely incorrect

Be encouraging in feedback while being specific about what was missing."""
