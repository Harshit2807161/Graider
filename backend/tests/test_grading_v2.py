"""Grading v2: code checks, agreement, stitching, choice groups (pure), then the per-question loop
and the submission graph with fake models."""

import pytest

from app.grading.checks import check_grade, check_rejections, check_replies, effective_agreement, evidence_found
from app.grading.choices import max_total, not_attempted, not_counted
from app.grading.sampling import spot_check
from app.grading.stitch import stitch
from app.rubrics.schema import Criterion, RubricSpec
from app.services.labels import ChoiceGroup

SPEC = RubricSpec(kind="criteria", subject="math", criteria_count=3, derived=False, criteria=[
    Criterion(id="c1", description="Subtracts 5", points=1), Criterion(id="c2", description="Divides by 2", points=1),
    Criterion(id="c3", description="x = 5", points=2)])
PASS_FAIL = RubricSpec(kind="pass_fail", subject="science", criteria_count=1, derived=False,
                       criteria=[Criterion(id="c1", description="Names carbon dioxide", points=2)])
ANSWER = "2x + 5 = 15\n2x = 10\nx = 5"


def crit(cid, score, evidence="", justification="ok"):
    return {"id": cid, "score": score, "evidence": evidence, "justification": justification}


# ===== checks =====

def test_a_correct_grading_passes_the_checks():
    assert check_grade([crit("c1", 1, "2x = 10"), crit("c2", 1, "x = 5"), crit("c3", 2, "x=5")], SPEC, ANSWER) == []


@pytest.mark.parametrize("criteria, error", [
    ([crit("c1", 1, "2x = 10"), crit("c2", 0)], "missing c3"),
    ([crit("c1", 1, "2x = 10"), crit("c1", 0), crit("c2", 0), crit("c3", 0)], "c1 appear more than once"),
    ([crit("c1", 1.5, "2x = 10"), crit("c2", 0), crit("c3", 0)], "outside 0..1"),
    ([crit("c1", 1, "x = 7"), crit("c2", 0), crit("c3", 0)], "not found in the answer"),
    ([crit("c1", 1, ""), crit("c2", 0), crit("c3", 0)], "quote the student's exact words"),
    ([crit("c1", 0, "", " "), crit("c2", 0), crit("c3", 0)], "c1: give a justification"),
])
def test_bad_gradings_are_caught(criteria, error):
    assert any(error in e for e in check_grade(criteria, SPEC, ANSWER))


def test_pass_fail_is_all_or_nothing():
    assert "scores 0 or 2, not 1" in check_grade([crit("c1", 1, "carbon dioxide")], PASS_FAIL, "carbon dioxide")[0]


def test_evidence_ignores_case_accents_and_spacing():
    assert evidence_found("Carbon Dioxide", "plants take in carbon díoxide")
    assert evidence_found("2x=10", "2x = 10") and not evidence_found("x = 4", ANSWER)


def test_revision_replies():
    feedback = [{"criterion_id": "c3", "point": "x = 5 is correct"}, {"criterion_id": "c1", "point": "no"}]
    assert check_replies([{"feedback_index": 0}, {"feedback_index": 1}], 2) == []
    assert "Reply to each of the 2" in check_replies([{"feedback_index": 0}], 2)[0]
    before, after = [crit("c1", 1), crit("c3", 0)], [crit("c1", 0), crit("c3", 2)]
    replies = [{"feedback_index": 0, "decision": "accept"}, {"feedback_index": 1, "decision": "reject"}]
    assert check_rejections(replies, feedback, before, after) == ["c1: you rejected feedback point 1 but changed its score."]


# ===== agreement =====

def test_agreement_is_the_lower_of_stated_and_score_gap():
    grader = [crit("c1", 1), crit("c2", 1), crit("c3", 2)]
    evaluator = [crit("c1", 1), crit("c2", 1), crit("c3", 2)]
    assert effective_agreement(0.9, grader, evaluator, SPEC, threshold=0.8, tolerance_fraction=0.25) == (0.9, [])


def test_high_stated_agreement_with_a_large_gap_is_disagreement():
    grader = [crit("c1", 1), crit("c2", 1), crit("c3", 2)]
    evaluator = [crit("c1", 1), crit("c2", 1), crit("c3", 0)]
    effective, apart = effective_agreement(0.95, grader, evaluator, SPEC, threshold=0.8, tolerance_fraction=0.25)
    assert apart == ["c3"] and effective == 0.5  # gap: 1 - 2/4


def test_a_criterion_beyond_tolerance_caps_agreement_below_the_threshold():
    grader = [crit("c1", 1), crit("c2", 0), crit("c3", 2)]
    evaluator = [crit("c1", 0), crit("c2", 1), crit("c3", 2)]  # same total, two criteria apart
    effective, apart = effective_agreement(1.0, grader, evaluator, SPEC, threshold=0.8, tolerance_fraction=0.25)
    assert apart == ["c1", "c2"] and effective == 0.79


# ===== stitching =====

def seg(label, text, starts=True, crossed=False, conf=0.9):
    return {"label": label, "label_as_written": "", "text": text, "starts_answer": starts,
            "crossed_out": crossed, "confidence": conf}


def test_answers_are_stitched_across_pages_in_any_order():
    stitched = stitch([
        (1, [seg("2", "Plants use light"), seg("1", "2x = 10")]),
        (2, [seg("unassigned", "x = 5", starts=False), seg("1", "wrong", crossed=True)]),
        (3, [seg("unassigned", "a stray note"), seg("2", "and chlorophyll", starts=False, conf=0.4)]),
    ])
    one, two = stitched.answers["1"], stitched.answers["2"]
    assert one.text == "2x = 10\nx = 5" and len(one.segments) == 3 and one.flags == []
    assert two.text == "Plants use light\nand chlorophyll" and two.confidence == 0.4
    assert [s["text"] for s in stitched.unassigned] == ["a stray note"]


def test_two_separate_starts_are_flagged():
    stitched = stitch([(1, [seg("1", "first try")]), (2, [seg("1", "second try")])])
    assert stitched.answers["1"].flags == ["multiple_attempts"]


# ===== choice groups and sampling =====

GROUPS = [ChoiceGroup(id="g1", labels=["3", "4"], pick=1)]


def test_unanswered_alternatives_are_not_graded():
    assert not_attempted(GROUPS, {"1", "3"}) == {"4"}
    assert not_attempted(GROUPS, {"1"}) == {"4"}  # neither answered: one answer is owed, so "3" escalates
    assert not_attempted(GROUPS, {"3", "4"}) == set()


def test_extra_alternatives_count_by_policy():
    scores = {"3": 1.0, "4": 3.0}
    assert not_counted(GROUPS, scores, ["3", "4"], "best") == {"3"}
    assert not_counted(GROUPS, scores, ["3", "4"], "first") == {"4"}
    assert max_total({"1": 2, "3": 4, "4": 4}, GROUPS) == 6


def test_spot_checks_are_reproducible():
    from uuid import UUID
    run, question = UUID(int=1), UUID(int=2)
    assert spot_check(run, question, 0.0) is False and spot_check(run, question, 1.0) is True
    assert spot_check(run, question, 0.5) == spot_check(run, question, 0.5)
