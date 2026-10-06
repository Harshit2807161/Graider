"""Code checks on a rubric spec (pure functions). A spec that fails them is never graded against."""

from typing import Optional

from app.rubrics.schema import RubricSpec

POINTS_TOLERANCE = 1e-6


def has_rubric_text(rubric_text: Optional[str]) -> bool:
    return bool(rubric_text and rubric_text.strip())


def validate_spec(spec: RubricSpec, *, max_score: float, rubric_text: Optional[str]) -> list[str]:
    """Return the reasons the spec can't be used to grade this question (empty if it can)."""
    errors: list[str] = []
    criteria = spec.criteria
    if not criteria:
        return ["The rubric has no criteria."]

    if spec.criteria_count != len(criteria):
        errors.append(f"criteria_count is {spec.criteria_count} but there are {len(criteria)} criteria.")

    ids = [c.id.strip() for c in criteria]
    if any(not i for i in ids):
        errors.append("Every criterion needs an id.")
    duplicates = sorted({i for i in ids if i and ids.count(i) > 1})
    if duplicates:
        errors.append(f"Criterion ids must be unique (repeated: {', '.join(duplicates)}).")
    for c in criteria:
        if not c.description.strip():
            errors.append(f"Criterion {c.id or '?'} has no description.")
        if c.points <= 0:
            errors.append(f"Criterion {c.id or '?'} must be worth more than 0 points (has {c.points:g}).")

    total = sum(c.points for c in criteria)
    if abs(total - max_score) > POINTS_TOLERANCE:
        errors.append(f"Criteria points add up to {total:g}, but the question is worth {max_score:g}.")

    if spec.kind == "pass_fail":
        if len(criteria) != 1:
            errors.append(f"A pass/fail rubric has exactly one criterion (has {len(criteria)}).")
        elif abs(criteria[0].points - max_score) > POINTS_TOLERANCE:
            errors.append(f"A pass/fail criterion is worth the full {max_score:g} points.")

    if spec.derived != (not has_rubric_text(rubric_text)):
        errors.append(
            "derived must be true exactly when the question has no rubric text "
            f"(derived={spec.derived}, rubric text {'present' if has_rubric_text(rubric_text) else 'empty'})."
        )
    return errors
