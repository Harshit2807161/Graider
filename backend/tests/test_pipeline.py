"""The grading pipeline end to end (pages -> answers -> grades -> saved versions) against a real
database with fake models."""

import shutil
from uuid import UUID

from sqlmodel import Session, select

from app.audit.runs import create_run
from app.core.constants import FailureCode, SubmissionStatus
from app.core.db import engine
from app.models.audit import GradingRun, LLMCall
from app.models.base import utcnow
from app.models.exam import Exam, Question, Submission, SubmissionAnswer
from app.models.grading import AnswerGrade, Transcription
from app.services.grading_service import run_grading
from tests import ingestion_fixtures as fx
from tests.conftest import FakeInvoker, FIXTURES


def make_submission(db: Session, exam, tmp_path, data: bytes = None, name="answer_sheet.png") -> Submission:
    sheet = tmp_path / name
    if data is None:
        shutil.copy(FIXTURES / "test_answer.png", sheet)
    else:
        sheet.write_bytes(data)
    submission = Submission(exam_id=exam.id, original_file_url=str(sheet))
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


async def grade(submission: Submission, **run) -> UUID:
    """Grade a submission the way the worker does: through a grading run."""
    with Session(engine) as db:
        run_row = create_run(db, submission_id=submission.id, trigger=run.pop("trigger", "upload"), **run)
    await run_grading(run_row.id)
    return run_row.id


def load(submission_id):
    with Session(engine) as db:
        submission = db.get(Submission, submission_id)
        answers = db.exec(
            select(SubmissionAnswer, Question).join(Question, Question.id == SubmissionAnswer.question_id)
            .where(SubmissionAnswer.submission_id == submission_id).order_by(Question.order_index)
        ).all()
        return submission, answers


def versions(model, submission_id):
    with Session(engine) as db:
        rows = db.exec(select(model, Question).join(Question, Question.id == model.question_id)
                       .where(model.submission_id == submission_id).order_by(Question.order_index, model.version)).all()
        return [(q.order_index, row.version, row.is_current, row) for row, q in rows]


def segment(label, text, starts=True, crossed=False, confidence=0.9):
    return {"label": label, "label_as_written": label, "text": text, "starts_answer": starts,
            "crossed_out": crossed, "confidence": confidence}


def page(*segments, kind="answers"):
    return {"page_kind": kind, "has_handwriting": True, "segments": list(segments)}


async def test_grades_each_question_and_saves_versioned_records(fake_llm, db, school, tmp_path):
    submission = make_submission(db, school["exam"], tmp_path)

    run_id = await grade(submission)

    graded, answers = load(submission.id)
    assert graded.status == SubmissionStatus.GRADED and (graded.total_score, graded.max_score) == (10, 10)
    assert [(a.student_answer_text, a.score, a.status) for a, _ in answers] == [
        ("student answer for Q1", 4, "graded"), ("student answer for Q2", 6, "graded")]
    grades = versions(AnswerGrade, submission.id)
    transcripts = versions(Transcription, submission.id)
    assert [(i, v, cur) for i, v, cur, _ in grades] == [(1, 1, True), (2, 1, True)]
    q1 = grades[0][3]
    assert q1.rubric_spec_id and q1.transcription_id == transcripts[0][3].id and q1.run_id == run_id
    assert q1.grader_model == "claude-sonnet-5-5" and q1.evaluator_model == "claude-opus-5-5" and len(q1.rounds) == 1
    assert q1.criteria[0]["evidence"] == "student answer for Q1"
    with Session(engine) as fresh:
        purposes = {c.purpose for c in fresh.exec(select(LLMCall).where(LLMCall.run_id == run_id)).all()}
    assert purposes == {"parse_rubric", "transcribe_page", "grade", "evaluate"}


async def test_pages_are_read_with_the_exams_labels(fake_llm, db, school, tmp_path):
    await grade(make_submission(db, school["exam"], tmp_path))
    call = fake_llm.calls_of("transcribe")[0]
    labels = call["request"].json_schema["properties"]["segments"]["items"]["properties"]["label"]["enum"]
    assert labels == ["Q1", "Q2", "unassigned"] and "Q1: Solve 2x + 5 = 15" in call["prompt"]


async def test_the_grader_gets_the_parsed_rubric(fake_llm, db, school, tmp_path):
    fake_llm.parse_rubric = lambda p: FakeInvoker._default_parse_rubric(p) if "Subtract 5" not in p else {
        "kind": "criteria", "subject": "math", "criteria_count": 2, "criteria": [
            {"description": "Subtracts 5 from both sides", "points": 2, "expected_answer": "2x = 10", "notes": None},
            {"description": "Divides by 2", "points": 2, "expected_answer": "x = 5", "notes": None}],
        "grading_notes": None, "parser_warnings": []}

    await grade(make_submission(db, school["exam"], tmp_path))

    q1 = next(c["prompt"] for c in fake_llm.calls_of("grade_answer") if "2x + 5" in c["prompt"])
    assert "[c1] Subtracts 5 from both sides (2 pts). Expected: 2x = 10" in q1 and "[c2] Divides by 2 (2 pts)" in q1


async def test_answers_are_stitched_across_pages_and_out_of_order(fake_llm, db, school, tmp_path):
    pages = iter([page(segment("Q2", "Plants use light"), segment("Q1", "2x = 10")),
                  page(segment("unassigned", "x = 5", starts=False), segment("unassigned", "a doodle"))])
    fake_llm.transcribe = lambda prompt: next(pages)

    submission = make_submission(db, school["exam"], tmp_path, fx.scanned_pdf(pages=2), "sheet.pdf")
    await grade(submission)

    graded, answers = load(submission.id)
    assert [a.student_answer_text for a, _ in answers] == ["2x = 10\nx = 5", "Plants use light"]
    assert [s["text"] for s in graded.unassigned_segments] == ["a doodle"]  # kept for the teacher


async def test_soft_deleted_questions_are_not_graded(fake_llm, db, school, tmp_path):
    second = max(school["exam"].questions, key=lambda q: q.order_index)
    second.deleted_at = utcnow()
    db.add(second)
    db.commit()

    submission = make_submission(db, school["exam"], tmp_path)
    await grade(submission)

    graded, answers = load(submission.id)
    assert [q.question_text for _, q in answers] == ["Solve 2x + 5 = 15"] and graded.max_score == 4


async def test_unreadable_pages_fail_instead_of_scoring_zero(fake_llm, db, school, tmp_path):
    fake_llm.transcribe = lambda prompt: "not json"
    submission = make_submission(db, school["exam"], tmp_path)

    await grade(submission)

    graded, answers = load(submission.id)
    assert graded.status == SubmissionStatus.FAILED and "couldn't be read" in graded.current_step and answers == []
    assert graded.failure_code == FailureCode.PAGES_UNREADABLE


async def test_a_question_whose_models_fail_escalates_alone(fake_llm, db, school, tmp_path):
    fake_llm.grade_answer = lambda p: "not json" if "photosynthesis" in p else FakeInvoker._default_grade_answer(p)
    submission = make_submission(db, school["exam"], tmp_path)

    await grade(submission)

    graded, answers = load(submission.id)
    assert graded.status == SubmissionStatus.NEEDS_REVIEW and graded.total_score == 4
    assert [(a.status, a.escalation_reason, a.score) for a, _ in answers] == [
        ("graded", None, 4), ("escalated", "all_models_failed", None)]


async def test_a_blank_answer_escalates_without_a_grader_call(fake_llm, db, school, tmp_path):
    fake_llm.transcribe = lambda prompt: page(segment("Q1", "2x = 10, x = 5"))
    submission = make_submission(db, school["exam"], tmp_path)

    await grade(submission)

    graded, answers = load(submission.id)
    assert graded.status == SubmissionStatus.NEEDS_REVIEW
    assert [(a.status, a.escalation_reason, a.score) for a, _ in answers] == [
        ("graded", None, 4), ("escalated", "no_answer_found", None)]
    assert not any("photosynthesis" in c["prompt"] for c in fake_llm.calls_of("grade_answer"))


async def test_an_invalid_rubric_blocks_only_its_question(fake_llm, db, school, tmp_path):
    fake_llm.parse_rubric = lambda p: FakeInvoker._default_parse_rubric(p) if "Subtract 5" not in p else {
        "kind": "criteria", "subject": "math", "criteria_count": 1, "criteria": [
            {"description": "Subtracts 5", "points": 3, "expected_answer": None, "notes": None}],
        "grading_notes": None, "parser_warnings": []}  # 3 points on a 4-mark question
    submission = make_submission(db, school["exam"], tmp_path)

    await grade(submission)

    graded, answers = load(submission.id)
    assert [(a.status, a.escalation_reason) for a, _ in answers] == [("escalated", "rubric_invalid"), ("graded", None)]
    assert not any("2x + 5" in c["prompt"] for c in fake_llm.calls_of("grade_answer"))


async def test_regrading_adds_new_versions_and_replaces_the_projection(fake_llm, db, school, tmp_path):
    submission = make_submission(db, school["exam"], tmp_path)
    await grade(submission)
    await grade(submission, trigger="regrade")

    graded, answers = load(submission.id)
    assert len(answers) == 2 and graded.status == SubmissionStatus.GRADED
    assert [(i, v, cur) for i, v, cur, _ in versions(AnswerGrade, submission.id)] == [
        (1, 1, False), (1, 2, True), (2, 1, False), (2, 2, True)]


async def test_runs_do_not_leak_state_into_each_other(fake_llm, db, school, tmp_path):
    await grade(make_submission(db, school["exam"], tmp_path))
    first, parses = len(fake_llm.calls), len(fake_llm.calls_of("parse_rubric"))

    await grade(make_submission(db, school["exam"], tmp_path))

    # Same work again, except the rubrics: parsed once, reused while the questions don't change
    assert parses == 2 and len(fake_llm.calls_of("parse_rubric")) == 2
    assert len(fake_llm.calls) - first == first - parses


async def test_llm_budget_stops_runaway_runs(fake_llm, db, school, tmp_path, monkeypatch):
    from app.llm.config import get_llm_settings
    monkeypatch.setattr(get_llm_settings(), "max_calls_base", 1)
    monkeypatch.setattr(get_llm_settings(), "max_calls_per_question", 0)
    submission = make_submission(db, school["exam"], tmp_path)

    await grade(submission)

    graded, _ = load(submission.id)
    assert graded.status == SubmissionStatus.FAILED and "budget" in graded.current_step
    assert graded.failure_code == FailureCode.BUDGET_EXHAUSTED


async def test_choice_groups_grade_the_attempted_alternative(fake_llm, db, school, tmp_path):
    exam = db.get(Exam, school["exam"].id)
    db.add(Question(exam_id=exam.id, order_index=3, question_text="Explain respiration", max_score=6))
    exam.config = {"choice_groups": [{"id": "g1", "labels": ["Q2", "Q3"], "pick": 1, "note": "either"}]}
    db.add(exam)
    db.commit()
    submission = make_submission(db, exam, tmp_path)
    fake_llm.transcribe = lambda prompt: page(segment("Q1", "x = 5"), segment("Q2", "light and chlorophyll"))

    await grade(submission)

    graded, answers = load(submission.id)
    assert graded.status == SubmissionStatus.GRADED and (graded.total_score, graded.max_score) == (10, 10)
    assert [a.status for a, _ in answers] == ["graded", "graded", "not_attempted"]


async def test_an_extra_alternative_does_not_count(fake_llm, db, school, tmp_path):
    exam = db.get(Exam, school["exam"].id)
    db.add(Question(exam_id=exam.id, order_index=3, question_text="Explain respiration", max_score=6))
    exam.config = {"choice_groups": [{"id": "g1", "labels": ["Q2", "Q3"], "pick": 1}], "choice_policy": "best"}
    db.add(exam)
    db.commit()
    fake_llm.grade_answer = lambda p: {**FakeInvoker._default_grade_answer(p), "criteria": [
        {**c, "score": 1.0} for c in FakeInvoker._default_grade_answer(p)["criteria"]]} if "respiration" in p \
        else FakeInvoker._default_grade_answer(p)
    submission = make_submission(db, exam, tmp_path)

    await grade(submission)

    graded, _ = load(submission.id)
    grades = {i: row for i, _, cur, row in versions(AnswerGrade, submission.id) if cur}
    assert grades[3].counted is False and "extra_alternative_not_counted" in grades[3].flags
    assert graded.total_score == 10  # Q1 4 + the better alternative (Q2, 6)


async def test_a_transcript_edit_regrades_only_that_question(fake_llm, db, school, tmp_path):
    submission = make_submission(db, school["exam"], tmp_path)
    await grade(submission)
    q1, q2 = sorted(school["exam"].questions, key=lambda q: q.order_index)
    with Session(engine) as fresh:  # what the M6 transcript edit will do
        old = fresh.exec(select(Transcription).where(Transcription.question_id == q1.id, Transcription.is_current == True)).one()  # noqa: E712
        old.is_current = False
        fresh.add(old)
        fresh.flush()
        fresh.add(Transcription(submission_id=submission.id, question_id=q1.id, version=2, source="teacher",
                                text="2x = 10 so x = 5"))
        fresh.commit()
    calls_before = len(fake_llm.calls)

    await grade(submission, trigger="transcript_edit", question_ids=[q1.id])

    new_calls = fake_llm.calls[calls_before:]
    assert [c["kind"] for c in new_calls] == ["grade_answer", "review"] and "2x = 10 so x = 5" in new_calls[0]["prompt"]
    current = {i: (v, row.source if hasattr(row, "source") else None) for i, v, cur, row in versions(AnswerGrade, submission.id) if cur}
    assert current == {1: (2, "ai"), 2: (1, "ai")}  # Q2 untouched
    graded, answers = load(submission.id)
    assert answers[0][0].student_answer_text == "2x = 10 so x = 5" and graded.status == SubmissionStatus.GRADED


def set_config(db, exam, **config):
    exam = db.get(Exam, exam.id)
    exam.config = {**(exam.config or {}), **config}
    db.add(exam)
    db.commit()
    return exam


async def test_an_exams_agreement_threshold_is_used_and_recorded(fake_llm, db, school, tmp_path):
    exam = set_config(db, school["exam"], agreement_threshold=0.97)
    run_id = await grade(make_submission(db, exam, tmp_path))

    # The evaluator agrees at 0.95 (the default fake): enough by default, not for this exam
    _, answers = load(db.exec(select(Submission)).one().id)
    assert [a.escalation_reason for a, _ in answers] == ["evaluator_disagreement"] * 2
    assert len(fake_llm.calls_of("revise")) == 4
    with Session(engine) as s:
        assert s.get(GradingRun, run_id).config_snapshot["grading"]["agreement_threshold"] == 0.97


async def test_an_exams_spot_check_rate_sends_confident_answers_to_review(fake_llm, db, school, tmp_path):
    exam = set_config(db, school["exam"], spot_check_rate=1.0)
    submission = make_submission(db, exam, tmp_path)
    await grade(submission)

    submission, answers = load(submission.id)
    assert submission.status == SubmissionStatus.NEEDS_REVIEW
    assert [(a.escalation_reason, a.score) for a, _ in answers] == [("spot_check", 4), ("spot_check", 6)]
