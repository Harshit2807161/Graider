"""Audit trail: grading runs and llm_calls are the system of record for what the AI did."""

import shutil

import pytest
from sqlmodel import Session, select

from app.audit import recorder as audit_recorder
from app.audit.runs import InvalidRunTransition, create_run, start_run
from app.core.constants import SubmissionStatus
from app.core.db import engine
from app.models.audit import GradingRun, LLMCall, RunStatus
from app.models.exam import Submission, SubmissionAnswer
from app.services.grading_service import run_grading
from tests.conftest import FIXTURES


def new_run(db: Session, exam, tmp_path) -> GradingRun:
    sheet = tmp_path / "answer_sheet.png"
    shutil.copy(FIXTURES / "test_answer.png", sheet)
    submission = Submission(exam_id=exam.id, original_file_url=str(sheet))
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return create_run(db, submission_id=submission.id, trigger="upload")


def reload(run_id):
    with Session(engine) as db:
        run = db.get(GradingRun, run_id)
        calls = db.exec(select(LLMCall).where(LLMCall.run_id == run_id).order_by(LLMCall.created_at)).all()
        submission = db.get(Submission, run.submission_id)
        answers = db.exec(select(SubmissionAnswer).where(SubmissionAnswer.submission_id == run.submission_id)).all()
        return run, calls, submission, answers


async def test_successful_run_records_every_call_and_its_config(fake_llm, db, school, tmp_path):
    run = new_run(db, school["exam"], tmp_path)

    await run_grading(run.id)

    run, calls, submission, _ = reload(run.id)
    assert run.status == RunStatus.SUCCEEDED and run.started_at and run.finished_at and run.error is None
    assert run.config_snapshot["grader"]["model"] == "claude-sonnet-5-5" and run.config_hash
    assert run.llm_calls == len(calls) == len(fake_llm.calls)
    assert {c.purpose for c in calls} == {"ocr_answers", "tag", "grade", "evaluate"}
    assert all(c.submission_id == submission.id and c.model_answered for c in calls)
    assert run.cost_usd == pytest.approx(sum(c.cost_usd for c in calls))


async def test_failed_run_keeps_its_calls_and_reason(fake_llm, db, school, tmp_path):
    fake_llm.grade = lambda p: "garbage"
    run = new_run(db, school["exam"], tmp_path)

    await run_grading(run.id)

    run, calls, submission, answers = reload(run.id)
    assert run.status == RunStatus.FAILED and "could not grade" in run.error
    assert submission.status == SubmissionStatus.FAILED and answers == []
    # Both the initial attempt and the repair attempt are on record, with their errors
    grade_calls = [c for c in calls if c.purpose == "grade"]
    assert [c.attempt_kind for c in grade_calls] == ["initial", "repair"]
    assert all(c.error_type == "OutputInvalid" for c in grade_calls)


async def test_redelivered_task_for_a_finished_run_does_nothing(fake_llm, db, school, tmp_path):
    run = new_run(db, school["exam"], tmp_path)
    await run_grading(run.id)
    calls_after_first = len(fake_llm.calls)

    await run_grading(run.id)  # Celery redelivery (at-least-once)

    _, calls, _, _ = reload(run.id)
    assert len(fake_llm.calls) == calls_after_first and len(calls) == calls_after_first


async def test_audit_write_failure_fails_the_run(fake_llm, db, school, tmp_path, monkeypatch):
    def broken(self, attempt):
        raise RuntimeError("audit store unavailable")

    monkeypatch.setattr(audit_recorder.DbCallRecorder, "record", broken)
    run = new_run(db, school["exam"], tmp_path)

    await run_grading(run.id)

    run, _, submission, answers = reload(run.id)
    # Fail closed: no grade without its audit record
    assert run.status == RunStatus.FAILED and "audit store unavailable" in run.error
    assert submission.status == SubmissionStatus.FAILED and answers == []


def test_run_status_only_moves_forward(db, school, tmp_path):
    run = new_run(db, school["exam"], tmp_path)
    run.status = RunStatus.SUCCEEDED
    with pytest.raises(InvalidRunTransition):
        start_run(db, run)


async def test_tracing_is_off_without_a_tracking_uri(fake_llm, db, school, tmp_path):
    run = new_run(db, school["exam"], tmp_path)
    await run_grading(run.id)
    run, _, _, _ = reload(run.id)
    assert run.mlflow_trace_id is None and run.status == RunStatus.SUCCEEDED
