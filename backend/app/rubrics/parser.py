"""The rubric_parser role: a question's natural-language rubric -> a RubricSpec.

The model does the extraction (kind, subject, criteria, points, expected answers); code only
assigns criterion ids, sets `derived` and checks the result (validate.py). Bump
PARSER_PROMPT_VERSION whenever the prompt or examples change; it is stored on every spec.
"""

import json
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.llm.router import get_router
from app.llm.types import CallContext, LLMRequest, Role, TextPart
from app.rubrics.schema import ParsedRubric, RubricSpec
from app.rubrics.validate import has_rubric_text, validate_spec

PARSER_PROMPT_VERSION = "rubric-parser-v1"


def _example(question: str, question_type: str, max_score: float, rubric: Optional[str], output: dict) -> str:
    return (
        f"<example>\n{user_prompt(question, rubric, max_score, question_type)}\n"
        f"Output:\n{json.dumps(output, indent=1)}\n</example>"
    )


def user_prompt(question_text: str, rubric_text: Optional[str], max_score: float, question_type: str) -> str:
    rubric = rubric_text.strip() if has_rubric_text(rubric_text) else "(none: derive the criteria from the question)"
    return (
        f"Question type: {question_type}\n"
        f"Maximum score: {max_score:g}\n"
        f"Question:\n{question_text.strip()}\n\n"
        f"Rubric:\n{rubric}"
    )


EXAMPLES = "\n\n".join([
    _example(
        "Which planet is closest to the Sun? (A) Venus (B) Mercury (C) Earth (D) Mars", "mcq", 1, "B",
        {"kind": "pass_fail", "subject": "science", "criteria_count": 1, "criteria": [
            {"description": "Chooses option B (Mercury)", "points": 1, "expected_answer": "B (Mercury)",
             "notes": None}],
         "grading_notes": None, "parser_warnings": []},
    ),
    _example(
        "Solve 2x + 5 = 15. Show your working.", "problem", 3,
        "Subtracts 5 from both sides (1 mark)\nDivides both sides by 2 (1 mark)\nx = 5 (1 mark)",
        {"kind": "criteria", "subject": "math", "criteria_count": 3, "criteria": [
            {"description": "Subtracts 5 from both sides", "points": 1, "expected_answer": None, "notes": None},
            {"description": "Divides both sides by 2", "points": 1, "expected_answer": None, "notes": None},
            {"description": "States the correct value of x", "points": 1, "expected_answer": "x = 5",
             "notes": None}],
         "grading_notes": None, "parser_warnings": []},
    ),
    _example(
        "Explain why Earth has seasons.", "descriptive", 6,
        "- Earth's axis is tilted\n- The tilt changes the angle of sunlight and day length through the year\n"
        "- The hemisphere tilted towards the Sun has summer",
        {"kind": "criteria", "subject": "science", "criteria_count": 3, "criteria": [
            {"description": "States that Earth's axis is tilted", "points": 2, "expected_answer": None, "notes": None},
            {"description": "Explains that the tilt changes the angle of sunlight and the length of the day "
                            "over the year", "points": 2, "expected_answer": None, "notes": None},
            {"description": "States that the hemisphere tilted towards the Sun has summer", "points": 2,
             "expected_answer": None, "notes": None}],
         "grading_notes": None,
         "parser_warnings": ["The rubric gives no marks per point, so the 6 marks were split equally. Please check."]},
    ),
    _example(
        "Define a renewable energy source and give one example.", "descriptive", 5,
        "Correct definition (2)\nValid example (2)",
        {"kind": "criteria", "subject": "science", "criteria_count": 2, "criteria": [
            {"description": "Defines a renewable source as one that is naturally replenished and won't run out",
             "points": 2, "expected_answer": None, "notes": None},
            {"description": "Gives a valid example of a renewable energy source", "points": 2,
             "expected_answer": None, "notes": None}],
         "grading_notes": None,
         "parser_warnings": ["The rubric's marks add up to 4, but the question is worth 5. Please fix the rubric "
                             "or the maximum score."]},
    ),
    _example(
        "Name the gas plants take in for photosynthesis and the gas they give out.", "descriptive", 2, None,
        {"kind": "criteria", "subject": "science", "criteria_count": 2, "criteria": [
            {"description": "Names carbon dioxide as the gas taken in", "points": 1,
             "expected_answer": "carbon dioxide (CO2)", "notes": None},
            {"description": "Names oxygen as the gas given out", "points": 1, "expected_answer": "oxygen (O2)",
             "notes": None}],
         "grading_notes": None,
         "parser_warnings": ["There was no rubric, so the criteria were derived from the question. Please check them."]},
    ),
])

SYSTEM_PROMPT = f"""You turn a teacher's marking rubric for one exam question into grading criteria that \
another model will grade students' answers against, one criterion at a time.

Rules:
1. Use only what the question and rubric say. Never change the teacher's marks to make them add up.
2. kind:
   - "pass_fail" when the answer is simply right or wrong (a multiple-choice option, a single value, a \
one-word fact): exactly one criterion worth the full maximum score.
   - "criteria" when marks are given for separate points, steps or qualities: one criterion per point.
3. points:
   - If the rubric gives marks per point, use them exactly.
   - If it lists points without marks, share the maximum score across them (equally unless the rubric \
implies otherwise) and add a parser warning that the split was inferred.
   - If the rubric's marks don't add up to the maximum score, keep them as written and add a parser \
warning. The teacher will fix it.
4. description: what the answer must contain or do, specific enough to check against a student's answer. \
Put an exact expected value or wording in expected_answer, and partial-credit rules in notes.
5. If there is no rubric, derive the criteria from the question: what a complete, correct answer must \
contain, adding up to the maximum score. Add a parser warning that the criteria were derived.
6. subject: math, english, science, history, or general.
7. grading_notes: guidance for the whole answer (e.g. "accept equivalent forms"), or null.
8. criteria_count: the number of criteria.
9. parser_warnings: anything the teacher should check; an empty list if nothing.

Examples:

{EXAMPLES}"""


class ParseResult(BaseModel):
    spec: RubricSpec
    errors: list[str]  # validation failures; empty means the spec can be graded against
    model: Optional[str]
    llm_call_id: UUID


async def parse_rubric(
    *, question_text: str, rubric_text: Optional[str], max_score: float, question_type: str
) -> ParseResult:
    """Parse one question's rubric. Raises LLMError if no model produced a usable answer."""
    result = await get_router().call(
        LLMRequest[ParsedRubric](
            role=Role.RUBRIC_PARSER,
            system=SYSTEM_PROMPT,
            parts=[TextPart(text=user_prompt(question_text, rubric_text, max_score, question_type))],
            output_schema=ParsedRubric,
            context=CallContext(purpose="parse_rubric"),
        )
    )
    spec = RubricSpec.from_parsed(result.parsed, derived=not has_rubric_text(rubric_text))
    return ParseResult(
        spec=spec,
        errors=validate_spec(spec, max_score=max_score, rubric_text=rubric_text),
        model=result.model_answered,
        llm_call_id=result.attempts[-1].id,
    )
