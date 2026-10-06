"""Grading pipeline tests against a real (SQLite) database with a fake LLM."""

import json
import shutil
from app.models.base import utcnow

import pytest
from sqlmodel import Session, select

from app.core.constants import SubmissionStatus
from app.core.db import engine
from app.models.exam import Question, Submission, SubmissionAnswer
from app.services.grading_service import run_grading_pipeline
from tests.conftest import FIXTURES


def make_submission(db: Session, exam, tmp_path) -> Submission:
    sheet = tmp_path / "answer_sheet.png"
    shutil.copy(FIXTURES / "test_answer.png", sheet)
    submission = Submission(exam_id=exam.id, original_file_url=str(sheet))
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def load(submission_id):
    with Session(engine) as db:
        submission = db.get(Submission, submission_id)
        answers = db.exec(
            select(SubmissionAnswer, Question)
            .join(Question, Question.id == SubmissionAnswer.question_id)
            .where(SubmissionAnswer.submission_id == submission_id)
            .order_by(Question.order_index)
        ).all()
        return submission, answers


async def test_grades_each_question_and_saves_against_the_right_question(fake_llm, db, school, tmp_path):
    submission = make_submission(db, school["exam"], tmp_path)

    await run_grading_pipeline(submission.id, submission.original_file_url)

    graded, answers = load(submission.id)
    assert graded.status == SubmissionStatus.GRADED
    assert graded.total_score == 5  # half of 4 + half of 6
    assert graded.max_score == 10
    assert graded.percentage == 50

    assert [q.question_text for _, q in answers] == ["Solve 2x + 5 = 15", "Explain photosynthesis"]
    # The transcribed answer is stored (it used to be overwritten with the question id)
    assert [a.student_answer_text for a, _ in answers] == ["student answer for Q1", "student answer for Q2"]


async def test_ocr_is_given_short_labels_not_database_ids(fake_llm, db, school, tmp_path):
    submission = make_submission(db, school["exam"], tmp_path)
    await run_grading_pipeline(submission.id, submission.original_file_url)

    ocr_prompt = fake_llm.calls_of("ocr")[0]["prompt"]
    assert "one of these ids: Q1, Q2" in ocr_prompt
    for question in db.exec(select(Question)).all():
        assert str(question.id) not in ocr_prompt


async def test_teacher_rubric_reaches_the_grader(fake_llm, db, school, tmp_path):
    submission = make_submission(db, school["exam"], tmp_path)
    await run_grading_pipeline(submission.id, submission.original_file_url)

    q1_prompt = next(c["prompt"] for c in fake_llm.calls_of("grade") if "2x + 5" in c["prompt"])
    assert "- Subtract 5" in q1_prompt and "- Divide by 2" in q1_prompt


async def test_answers_are_matched_by_label_even_if_returned_out_of_order(fake_llm, db, school, tmp_path):
    fake_llm.ocr = lambda p: json.dumps({"answers": [
        {"question_id": "Q2", "text": "chlorophyll", "confidence": 0.9},
        {"question_id": "Q1", "text": "x = 5", "confidence": 0.9},
    ]})
    submission = make_submission(db, school["exam"], tmp_path)
    await run_grading_pipeline(submission.id, submission.original_file_url)

    _, answers = load(submission.id)
    by_question = {q.question_text: a.student_answer_text for a, q in answers}
    assert by_question == {"Solve 2x + 5 = 15": "x = 5", "Explain photosynthesis": "chlorophyll"}


async def test_soft_deleted_questions_are_not_graded(fake_llm, db, school, tmp_path):
    exam = school["exam"]
    removed = db.exec(select(Question).where(Question.exam_id == exam.id).order_by(Question.order_index)).first()
    removed.deleted_at = utcnow()
    db.add(removed)
    db.commit()

    submission = make_submission(db, exam, tmp_path)
    await run_grading_pipeline(submission.id, submission.original_file_url)

    graded, answers = load(submission.id)
    assert graded.max_score == 6
    assert [q.question_text for _, q in answers] == ["Explain photosynthesis"]


@pytest.mark.parametrize("ocr_output", ["I can't read this", '{"answers": []}'])
async def test_unreadable_answer_sheet_fails_instead_of_scoring_zero(fake_llm, db, school, tmp_path, ocr_output):
    fake_llm.ocr = lambda p: ocr_output
    submission = make_submission(db, school["exam"], tmp_path)

    await run_grading_pipeline(submission.id, submission.original_file_url)

    graded, answers = load(submission.id)
    assert graded.status == SubmissionStatus.FAILED
    assert graded.current_step.startswith("Error:")
    assert answers == []


async def test_grader_failure_fails_the_submission(fake_llm, db, school, tmp_path):
    fake_llm.grade = lambda p: "garbage"
    submission = make_submission(db, school["exam"], tmp_path)

    await run_grading_pipeline(submission.id, submission.original_file_url)

    graded, answers = load(submission.id)
    assert graded.status == SubmissionStatus.FAILED
    assert answers == []


async def test_regrading_replaces_previous_answers(fake_llm, db, school, tmp_path):
    submission = make_submission(db, school["exam"], tmp_path)
    await run_grading_pipeline(submission.id, submission.original_file_url)
    await run_grading_pipeline(submission.id, submission.original_file_url)

    _, answers = load(submission.id)
    assert len(answers) == 2


async def test_regrading_the_same_question_does_not_leak_state_between_runs(fake_llm, db, school, tmp_path):
    # The old checkpointer keyed graph state by question id, so attempts accumulated across runs
    from app.agents.orchestrator import get_orchestrator

    first = make_submission(db, school["exam"], tmp_path)
    await run_grading_pipeline(first.id, first.original_file_url)
    calls_first_run = len(fake_llm.calls)

    second = make_submission(db, school["exam"], tmp_path)
    await run_grading_pipeline(second.id, second.original_file_url)

    assert len(fake_llm.calls) == 2 * calls_first_run
    assert get_orchestrator().compiled_graph.checkpointer is None


async def test_llm_budget_stops_runaway_runs(fake_llm, db, school, tmp_path, monkeypatch):
    from app.llm.config import get_llm_settings
    monkeypatch.setattr(get_llm_settings(), "max_calls_base", 2)
    monkeypatch.setattr(get_llm_settings(), "max_calls_per_question", 0)
    submission = make_submission(db, school["exam"], tmp_path)

    await run_grading_pipeline(submission.id, submission.original_file_url)

    graded, _ = load(submission.id)
    assert graded.status == SubmissionStatus.FAILED
    assert "budget" in graded.current_step
