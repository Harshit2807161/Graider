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


# ===== the per-question loop (fake models) =====

from uuid import uuid4  # noqa: E402

from app.grading.question import QuestionInput, grade_question  # noqa: E402
from app.grading.stitch import StitchedAnswer  # noqa: E402
from app.llm.budget import LLMBudgetExceeded, budget  # noqa: E402
from tests.conftest import FakeInvoker  # noqa: E402

FULL = [("c1", 1.0, "2x = 10"), ("c2", 1.0, "x = 5"), ("c3", 2.0, "x = 5")]


def question(spec=SPEC, text=ANSWER, confidence=0.9, starts=1):
    answer = StitchedAnswer("1", parts=[text], starts=starts,
                            segments=[{"confidence": confidence, "crossed_out": False, "page": 1}])
    return QuestionInput(uuid4(), "1", "Solve 2x + 5 = 15.", 4.0, spec, answer if text else None)


def grading(scores, flags=()):
    return {"criteria": [crit(cid, score, evidence if score else "") for (cid, _, evidence), score in zip(FULL, scores)],
            "feedback": "fb", "flags": list(flags)}


def review(own, agreement, points=()):
    return {"own_assessment": [{"id": cid, "score": s, "reason": "r"} for (cid, _, _), s in zip(FULL, own)],
            "agreement": agreement, "feedback": [{"criterion_id": c, "point": p} for c, p in points], "summary": "s"}


def revision(scores, decisions):
    return {"replies": [{"feedback_index": i, "decision": d, "rationale": "because"} for i, d in enumerate(decisions)],
            **grading(scores)}


async def test_agreement_in_round_one_takes_two_calls(fake_llm):
    outcome = await grade_question(question(), uuid4())
    assert outcome.status == "graded" and outcome.score == 4 and len(outcome.rounds) == 1
    assert [c["kind"] for c in fake_llm.calls] == ["grade_answer", "review"]
    assert outcome.grader_model == "claude-sonnet-5-5" and outcome.evaluator_model == "claude-opus-5-5"


async def test_grader_revises_once_then_the_evaluator_agrees(fake_llm):
    reviews = iter([review([1, 1, 0], 0.5, [("c3", "x = 5 is stated but unjustified")]), review([1, 1, 0], 0.95)])
    fake_llm.review = lambda p: next(reviews)
    fake_llm.revise = lambda p: revision([1, 1, 0], ["accept"])

    outcome = await grade_question(question(), uuid4())

    assert outcome.status == "graded" and outcome.score == 2 and len(outcome.rounds) == 2
    assert outcome.rounds[0]["replies"][0]["decision"] == "accept" and outcome.rounds[0]["effective_agreement"] < 0.8
    assert [c["kind"] for c in fake_llm.calls] == ["grade_answer", "review", "revise", "review"]


async def test_the_grader_can_push_back_and_be_accepted(fake_llm):
    reviews = iter([review([1, 1, 0], 0.5, [("c3", "x = 5 is wrong")]), review([1, 1, 2], 0.9)])
    fake_llm.review = lambda p: next(reviews)
    fake_llm.revise = lambda p: revision([1, 1, 2], ["reject"])

    outcome = await grade_question(question(), uuid4())

    assert outcome.status == "graded" and outcome.score == 4  # the grader kept its score, with reasons
    assert outcome.rounds[0]["replies"] == [{"feedback_index": 0, "decision": "reject", "rationale": "because"}]


async def test_two_revisions_without_agreement_escalate_with_both_positions(fake_llm):
    fake_llm.review = lambda p: review([1, 1, 0], 0.4, [("c3", "x = 5 is wrong")])
    fake_llm.revise = lambda p: revision([1, 1, 2], ["reject"])

    outcome = await grade_question(question(), uuid4())

    assert outcome.status == "escalated" and outcome.escalation_reason == "evaluator_disagreement"
    assert outcome.score == 4 and len(outcome.rounds) == 3  # the grader's proposal is kept for the teacher
    assert all(r["grader_total"] == 4 and r["evaluator_total"] == 2 for r in outcome.rounds)
    assert [c["kind"] for c in fake_llm.calls].count("revise") == 2


async def test_stated_agreement_with_a_large_score_gap_still_triggers_revision(fake_llm):
    reviews = iter([review([1, 1, 0], 0.99, [("c3", "x = 5 missing")]), review([1, 1, 2], 0.99)])
    fake_llm.review = lambda p: next(reviews)
    outcome = await grade_question(question(), uuid4())
    assert outcome.rounds[0]["criteria_apart"] == ["c3"] and len(outcome.rounds) == 2


async def test_a_grading_that_fails_the_checks_is_repaired_once(fake_llm):
    attempts = iter([grading([2, 1, 2]), grading([1, 1, 2])])  # first: c1 above its 1 point
    fake_llm.grade_answer = lambda p: next(attempts)
    outcome = await grade_question(question(), uuid4())
    assert outcome.status == "graded" and outcome.score == 4
    assert [c["request"].trace_metadata["purpose"] for c in fake_llm.calls_of("grade_answer")] == ["grade", "grade_fix"]
    assert "outside 0..1" in fake_llm.calls_of("grade_answer")[1]["prompt"]


async def test_a_grading_that_fails_the_checks_twice_escalates(fake_llm):
    fake_llm.grade_answer = lambda p: grading([2, 1, 2])
    outcome = await grade_question(question(), uuid4())
    assert outcome.escalation_reason == "check_failed" and outcome.score is None and fake_llm.calls_of("review") == []


async def test_an_illegible_flag_skips_the_evaluator(fake_llm):
    fake_llm.grade_answer = lambda p: grading([0, 0, 0], flags=["illegible"])
    outcome = await grade_question(question(), uuid4())
    assert outcome.escalation_reason == "grader_flag:illegible" and outcome.score is None
    assert fake_llm.calls_of("review") == []


async def test_a_blank_answer_or_a_broken_rubric_escalates_without_any_call(fake_llm):
    blank = await grade_question(question(text=""), uuid4())
    no_rubric = await grade_question(question(spec=None), uuid4())
    assert blank.escalation_reason == "no_answer_found" and no_rubric.escalation_reason == "rubric_invalid"
    assert blank.score is None and fake_llm.calls == []


async def test_low_confidence_repeated_attempts_and_spot_checks_keep_the_proposed_score(fake_llm, monkeypatch):
    from app.core.config import settings

    low = await grade_question(question(confidence=0.3), uuid4())
    twice = await grade_question(question(starts=2), uuid4())
    monkeypatch.setattr(settings, "GRADING_SPOT_CHECK_RATE", 1.0)
    spot = await grade_question(question(), uuid4())
    assert [(o.escalation_reason, o.score) for o in (low, twice, spot)] == [
        ("low_ocr_confidence", 4), ("multiple_attempts", 4), ("spot_check", 4)]


async def test_grader_fallback_never_lands_on_the_evaluators_model(fake_llm, monkeypatch):
    from app.llm.config import get_llm_settings
    from app.llm.types import LLMTransportError

    monkeypatch.setenv("LLM__GRADER__PROVIDER", "anthropic")
    monkeypatch.setenv("LLM__GRADER__MODEL", "claude-sonnet-5-5")
    monkeypatch.setenv("LLM__GRADER__FALLBACKS",
                       '[{"provider": "anthropic", "model": "claude-opus-5-5"}, {"provider": "anthropic", "model": "claude-haiku-4-5"}]')
    get_llm_settings.cache_clear()
    attempts = iter([LLMTransportError("primary down"), None])
    fake_llm.grade_answer = lambda p: next(attempts) or FakeInvoker._default_grade_answer(p)
    try:
        outcome = await grade_question(question(), uuid4())
    finally:
        get_llm_settings.cache_clear()
    assert outcome.grader_model == "claude-haiku-4-5" and outcome.fallback_used  # opus skipped
    assert outcome.evaluator_model == "claude-opus-5-5"


async def test_an_exhausted_budget_stops_the_run(fake_llm):
    with budget(1), pytest.raises(LLMBudgetExceeded):
        await grade_question(question(), uuid4())


def test_transcribe_prompt_question_context() -> None:
    from app.grading import prompts

    long = "passage " * 200
    out = prompts.transcribe_prompt([("2(a)", long, "Q.2 (a)", "g1"), ("2(b)", "Part b text")], 1, 2)
    assert "- 2(a) (printed as Q.2 (a)) [choice group g1]: " in out and "- 2(b): Part b text" in out
    assert "…" in out and len(out) < 1000
    many = [(f"Q{i}", "x" * 900) for i in range(100)]
    listing = prompts.question_listing(many)
    assert len(listing) <= prompts.QUESTION_BLOCK_CAP + 100 and listing.count("\n") == 99
    assert "bare sub-part" in prompts.TRANSCRIBE_SYSTEM
