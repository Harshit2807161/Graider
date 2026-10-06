"""RubricSpec v1: the structured rubric a question is graded against (Proposal 002, section 6).

`ParsedRubric` is what the rubric_parser model returns; code then adds criterion ids, the
`derived` flag and the schema version to make a `RubricSpec`. Teachers edit specs through
`RubricSpecEdit`. Domain rules (points add up to the question's max score, etc.) are checked
in `validate.py`, not here, so a spec that breaks them can still be stored and shown to the
teacher with the reasons.
"""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SPEC_SCHEMA_VERSION = 1

Subject = Literal["math", "english", "science", "history", "general"]
RubricKind = Literal["pass_fail", "criteria"]


# ===== model output =====

class ParsedCriterion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(description="What the answer must contain or do to earn these points")
    points: float = Field(description="Points awarded for this criterion")
    expected_answer: Optional[str] = Field(description="The expected value or wording, if the rubric gives one")
    notes: Optional[str] = Field(description="Partial-credit rules or other guidance for this criterion")


class ParsedRubric(BaseModel):
    """Output of the rubric_parser role."""

    model_config = ConfigDict(extra="forbid", title="ParsedRubric")

    kind: RubricKind = Field(description="pass_fail: one all-or-nothing criterion; criteria: separately scored parts")
    subject: Subject
    criteria_count: int = Field(description="Number of criteria in `criteria`")
    criteria: list[ParsedCriterion]
    grading_notes: Optional[str] = Field(description="Guidance that applies to the whole answer")
    parser_warnings: list[str] = Field(
        description="Problems the teacher should check, e.g. marks that don't add up or points you had to infer"
    )


# ===== stored spec =====

class Criterion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    description: str
    points: float
    expected_answer: Optional[str] = None
    notes: Optional[str] = None


class RubricSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spec_schema_version: Literal[1] = SPEC_SCHEMA_VERSION
    kind: RubricKind
    subject: Subject
    criteria_count: int
    criteria: list[Criterion]
    grading_notes: Optional[str] = None
    parser_warnings: list[str] = []
    derived: bool  # true when the question had no rubric text and the criteria were derived from it

    @classmethod
    def from_parsed(cls, parsed: ParsedRubric, *, derived: bool) -> "RubricSpec":
        return cls(
            kind=parsed.kind,
            subject=parsed.subject,
            criteria_count=parsed.criteria_count,
            criteria=[Criterion(id=f"c{i}", **c.model_dump()) for i, c in enumerate(parsed.criteria, start=1)],
            grading_notes=parsed.grading_notes,
            parser_warnings=parsed.parser_warnings,
            derived=derived,
        )


class RubricSpecEdit(BaseModel):
    """A teacher's edited spec. Criterion count, derived flag and version are set by the server."""

    model_config = ConfigDict(extra="forbid")

    kind: RubricKind
    subject: Subject
    criteria: list[Criterion]
    grading_notes: Optional[str] = None
