"""Choice groups ("attempt either 5 or 6"): what to grade and what counts (pure code)."""

from typing import Literal

from app.services.labels import ChoiceGroup

Policy = Literal["best", "first"]


def not_attempted(groups: list[ChoiceGroup], answered: set[str]) -> set[str]:
    """Unanswered alternatives that aren't owed: they aren't graded or counted. If the student
    answered fewer than the group asks for, the first unanswered ones stay owed (and escalate as
    'no answer found'), one per missing answer."""
    skipped: set[str] = set()
    for group in groups:
        unanswered = [label for label in group.labels if label not in answered]
        owed = max(0, group.pick - (len(group.labels) - len(unanswered)))
        skipped |= set(unanswered[owed:])
    return skipped


def not_counted(
    groups: list[ChoiceGroup], scores: dict[str, float], order: list[str], policy: Policy
) -> set[str]:
    """When a student answered more alternatives than allowed: which graded answers don't count.
    'best' keeps the highest scores; 'first' keeps the first answered (in page order)."""
    dropped: set[str] = set()
    for group in groups:
        attempted = [label for label in group.labels if label in scores]
        if len(attempted) <= group.pick:
            continue
        if policy == "first":
            ranked = sorted(attempted, key=lambda label: order.index(label) if label in order else len(order))
        else:
            ranked = sorted(attempted, key=lambda label: -scores[label])
        dropped |= set(ranked[group.pick:])
    return dropped


def max_total(max_scores: dict[str, float], groups: list[ChoiceGroup]) -> float:
    """The submission's maximum: compulsory questions plus `pick` of each group's best-marked."""
    grouped = {label for group in groups for label in group.labels}
    total = sum(score for label, score in max_scores.items() if label not in grouped)
    for group in groups:
        marks = sorted((max_scores[label] for label in group.labels if label in max_scores), reverse=True)
        total += sum(marks[: group.pick])
    return total
