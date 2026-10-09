"""Code checks on model output (Proposal 002 §7.1, decision 8) and the effective agreement."""

import unicodedata
from typing import Any

from app.rubrics.schema import RubricSpec

EPSILON = 1e-6


def _normalise(text: str) -> str:
    """Compare quotes forgivingly: accents, case and whitespace don't matter."""
    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return "".join(stripped.casefold().split())


def evidence_found(evidence: str, answer: str) -> bool:
    return bool(evidence.strip()) and _normalise(evidence) in _normalise(answer)


def check_scores(criteria: list[dict[str, Any]], spec: RubricSpec) -> list[str]:
    """Every criterion scored exactly once, within its points; pass/fail all or nothing."""
    errors: list[str] = []
    points = {c.id: c.points for c in spec.criteria}
    ids = [c["id"] for c in criteria]
    missing = [i for i in points if i not in ids]
    repeated = sorted({i for i in ids if ids.count(i) > 1})
    unknown = sorted({i for i in ids if i not in points})
    if missing:
        errors.append(f"Score every criterion: missing {', '.join(missing)}.")
    if repeated:
        errors.append(f"Score each criterion once: {', '.join(repeated)} appear more than once.")
    if unknown:
        errors.append(f"Unknown criteria: {', '.join(unknown)}.")
    for c in criteria:
        cid, score, top = c["id"], c["score"], points.get(c["id"], 0.0)
        if cid not in points:
            continue
        if not -EPSILON <= score <= top + EPSILON:
            errors.append(f"{cid}: score {score:g} is outside 0..{top:g}.")
        elif spec.kind == "pass_fail" and not (abs(score) < EPSILON or abs(score - top) < EPSILON):
            errors.append(f"{cid}: a pass/fail criterion scores 0 or {top:g}, not {score:g}.")
    return errors


def check_grade(criteria: list[dict[str, Any]], spec: RubricSpec, answer: str) -> list[str]:
    """Reasons a model's grading can't be accepted as it is (empty when it can): the score checks,
    plus quoted evidence for every score above 0 and a justification for every criterion."""
    errors = check_scores(criteria, spec)
    for c in criteria:
        if c["score"] > EPSILON and not evidence_found(c.get("evidence", ""), answer):
            errors.append(f"{c['id']}: quote the student's exact words as evidence for a score above 0 "
                          f"(not found in the answer: {c.get('evidence', '')!r}).")
        if not c.get("justification", "").strip():
            errors.append(f"{c['id']}: give a justification.")
    return errors


def check_replies(replies: list[dict], feedback_count: int) -> list[str]:
    """Every feedback point answered exactly once."""
    errors = []
    indexes = [r["feedback_index"] for r in replies]
    if sorted(indexes) != list(range(feedback_count)):
        errors.append(f"Reply to each of the {feedback_count} feedback points once (feedback_index 0..{feedback_count - 1}).")
    return errors


def check_rejections(replies: list[dict], feedback: list[dict], before: list[dict], after: list[dict]) -> list[str]:
    old = {c["id"]: c["score"] for c in before}
    new = {c["id"]: c["score"] for c in after}
    errors = []
    for reply in replies:
        index = reply["feedback_index"]
        if reply["decision"] == "reject" and 0 <= index < len(feedback):
            cid = feedback[index]["criterion_id"]
            if abs(old.get(cid, 0.0) - new.get(cid, 0.0)) > EPSILON:
                errors.append(f"{cid}: you rejected feedback point {index} but changed its score.")
    return errors


def total(criteria: list[dict]) -> float:
    return round(sum(c["score"] for c in criteria), 6)


def effective_agreement(
    stated: float, grader: list[dict], evaluator: list[dict], spec: RubricSpec, *,
    threshold: float, tolerance_fraction: float,
) -> tuple[float, list[str]]:
    """min(stated agreement, score-gap agreement); any criterion apart by more than its tolerance
    counts as disagreement. Returns (effective agreement, criteria in disagreement)."""
    max_score = sum(c.points for c in spec.criteria) or 1.0
    gap = 1.0 - abs(total(grader) - total(evaluator)) / max_score
    effective = max(0.0, min(stated, gap))
    g = {c["id"]: c["score"] for c in grader}
    e = {c["id"]: c["score"] for c in evaluator}
    apart = []
    for c in spec.criteria:
        tolerance = 0.0 if spec.kind == "pass_fail" else tolerance_fraction * c.points
        if abs(g.get(c.id, 0.0) - e.get(c.id, 0.0)) > tolerance + EPSILON:
            apart.append(c.id)
    if apart:
        effective = min(effective, threshold - 0.01)
    return round(effective, 4), apart
