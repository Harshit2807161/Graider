"""Rubric specs: validation, LLM parsing, parse triggers, teacher edits, API and tenancy."""

import pytest

from app.rubrics.schema import Criterion, RubricSpec
from app.rubrics.validate import validate_spec


def spec(kind="criteria", points=(1, 1, 2), ids=None, descriptions=None, count=None, derived=False) -> RubricSpec:
    ids = ids or [f"c{i}" for i in range(1, len(points) + 1)]
    descriptions = descriptions or [f"point {i}" for i in range(1, len(points) + 1)]
    return RubricSpec(
        kind=kind,
        subject="science",
        criteria_count=len(points) if count is None else count,
        criteria=[Criterion(id=i, description=d, points=p) for i, d, p in zip(ids, descriptions, points)],
        derived=derived,
    )


@pytest.mark.parametrize(
    "case, rubric_text, max_score, error",
    [
        (spec(), "rubric", 4, None),
        (spec(points=(0.5, 0.5, 1)), "rubric", 2, None),
        (spec(kind="pass_fail", points=(2,)), "B", 2, None),
        (spec(points=(4,), derived=True), None, 4, None),
        (spec(points=(4,), derived=True), "   ", 4, None),
        (spec(points=()), "rubric", 4, "no criteria"),
        (spec(points=(1, 1, 1)), "rubric", 4, "add up to 3, but the question is worth 4"),
        (spec(points=(2, 0, 2)), "rubric", 4, "more than 0 points"),
        (spec(points=(2, -1, 3)), "rubric", 4, "more than 0 points"),
        (spec(ids=["c1", "c1", "c2"]), "rubric", 4, "unique (repeated: c1)"),
        (spec(ids=["c1", " ", "c3"]), "rubric", 4, "needs an id"),
        (spec(descriptions=["a", "", "c"]), "rubric", 4, "has no description"),
        (spec(count=2), "rubric", 4, "criteria_count is 2"),
        (spec(kind="pass_fail", points=(2, 2)), "rubric", 4, "exactly one criterion"),
        (spec(kind="pass_fail", points=(3,)), "rubric", 4, "add up to 3"),
        (spec(derived=True), "rubric", 4, "derived must be true exactly when"),
        (spec(points=(4,)), "", 4, "derived must be true exactly when"),
    ],
)
def test_validation(case, rubric_text, max_score, error):
    errors = validate_spec(case, max_score=max_score, rubric_text=rubric_text)
    if error is None:
        assert errors == []
    else:
        assert any(error in e for e in errors), errors
