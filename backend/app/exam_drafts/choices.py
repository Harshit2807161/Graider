"""Internal choices inside one draft question ("(a) ... OR (b) ...").

Graded as one question, both alternatives' criteria add up to more than the question's marks. The
teacher is offered a split into two questions (same marks each) in one choice group, pick 1.
"""

import re
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.exam_drafts.schema import DraftQuestion

OR_WORDS = ("OR", "Or", "or", "या", "अथवा")
_OR_LINE = re.compile(r"^\s*[\(\[]?\s*(?:OR|Or|or|या|अथवा)\s*[\)\]]?\s*$")
_INLINE = re.compile(
    r"^(?P<pre>.*?)\(\s*(?P<l1>a|i)\s*\)(?P<first>.*?)\s+(?:OR|Or|या|अथवा)\s+\(\s*(?P<l2>b|ii)\s*\)(?P<second>.*)$",
    re.DOTALL,
)
_PART_LABEL = re.compile(r"^\s*\(\s*(a|b|i|ii)\s*\)\s*")
_RUBRIC_MARKS = re.compile(r"(\d+(?:\.\d+)?)\s*(?:marks?\b|m\b)|\[\s*(\d+(?:\.\d+)?)\s*\]", re.IGNORECASE)


class SplitPart(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    text: str
    marks: Optional[float]


class SuggestedSplit(BaseModel):
    """Two questions replacing `label`, one choice group asking for one of them."""

    model_config = ConfigDict(extra="forbid")

    label: str
    parts: list[SplitPart]
    pick: int = 1


def rubric_marks(rubric: Optional[str]) -> Optional[float]:
    """Sum of the marks written in a free-text rubric ("1 mark", "2 marks", "[1]"); None if none are."""
    found = [float(a or b) for a, b in _RUBRIC_MARKS.findall(rubric or "")]
    return sum(found) if found else None


def _split_text(text: str) -> Optional[tuple[str, str, bool]]:
    """(first, second, roman) when the text holds exactly one standalone OR between two parts."""
    lines = text.splitlines()
    seps = [i for i, line in enumerate(lines) if _OR_LINE.match(line)]
    if len(seps) == 1:
        first = "\n".join(lines[: seps[0]]).strip()
        second = "\n".join(lines[seps[0] + 1:]).strip()
        if first and second:
            roman = bool(re.match(r"^\s*\(\s*i\s*\)", first)) and bool(re.match(r"^\s*\(\s*ii\s*\)", second))
            return _PART_LABEL.sub("", first, count=1), _PART_LABEL.sub("", second, count=1), roman
        return None
    if seps:
        return None
    match = _INLINE.match(text)
    if not match or (match["l1"], match["l2"]) not in {("a", "b"), ("i", "ii")}:
        return None
    pre = match["pre"].strip()
    first, second = match["first"].strip(), match["second"].strip()
    if not first or not second:
        return None
    if pre:
        first, second = f"{pre}\n{first}", f"{pre}\n{second}"
    return first, second, match["l1"] == "i"


def suggest_internal_choice_split(question: DraftQuestion) -> Optional[SuggestedSplit]:
    """A split for a question with an internal OR choice, or None.

    Not suggested when the question is already in a choice group, or when its rubric's marks fit
    within the question's marks (then the rubric already treats it as one answer).
    """
    if question.choice_group:
        return None
    split = _split_text(question.text)
    if split is None:
        return None
    rubric_total = rubric_marks(question.rubric)
    if rubric_total is not None and question.marks is not None and rubric_total <= question.marks + 1e-6:
        return None
    first, second, roman = split
    suffixes = ("(i)", "(ii)") if roman else ("(a)", "(b)")
    return SuggestedSplit(label=question.label, parts=[
        SplitPart(label=f"{question.label}{suffixes[0]}", text=first, marks=question.marks),
        SplitPart(label=f"{question.label}{suffixes[1]}", text=second, marks=question.marks),
    ])
