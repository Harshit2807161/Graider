"""Rubric specs: validation, LLM parsing, parse triggers, teacher edits, API and tenancy."""

import pytest

from app.core.constants import SubmissionStatus
from tests.conftest import FakeInvoker

from app.rubrics.schema import Criterion, RubricSpec, RubricSpecEdit
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


# ===== parsing and storing =====

from sqlmodel import Session, select  # noqa: E402

from app import crud  # noqa: E402
from app.core.db import engine  # noqa: E402
from app.models.audit import LLMCall  # noqa: E402
from app.models.base import utcnow  # noqa: E402
from app.models.exam import Exam, Question  # noqa: E402
from app.models.rubric import RubricSpecRecord, RubricStatus  # noqa: E402
from app.rubrics import service  # noqa: E402
from app.rubrics.parser import PARSER_PROMPT_VERSION  # noqa: E402


def questions(db, exam) -> list[Question]:
    return crud.question.get_by_exam(db, exam_id=exam.id)


def reload(question_id):
    with Session(engine) as db:
        question = db.get(Question, question_id)
        specs = db.exec(
            select(RubricSpecRecord).where(RubricSpecRecord.question_id == question_id).order_by(RubricSpecRecord.version)
        ).all()
        current = service.current_spec(db, question)
        return question, specs, current


async def parse(question: Question, *, force: bool = False):
    """What the queued parse_rubric_task does for the question's current inputs."""
    await service.parse_question_rubric(question.id, service.rubric_input_hash(question), force=force)


def wrong_total(prompt):
    return {"kind": "criteria", "subject": "math", "criteria_count": 2, "criteria": [
        {"description": "Subtracts 5", "points": 1, "expected_answer": None, "notes": None},
        {"description": "Divides by 2", "points": 2, "expected_answer": None, "notes": None},
    ], "grading_notes": None, "parser_warnings": ["The rubric's marks add up to 3, but the question is worth 4."]}


async def test_parse_stores_a_ready_spec_linked_to_its_model_call(fake_llm, db, school):
    q1 = questions(db, school["exam"])[0]

    await parse(q1)

    question, specs, current = reload(q1.id)
    assert question.rubric_status == RubricStatus.READY and len(specs) == 1 and current.id == specs[0].id
    assert current.version == 1 and current.source == "ai" and current.validation_errors == []
    assert current.parser_prompt_version == PARSER_PROMPT_VERSION and current.model == "claude-opus-5-5"
    assert current.inputs["rubric_text"] == "Subtract 5\nDivide by 2" and current.spec["derived"] is False
    assert [c["id"] for c in current.spec["criteria"]] == ["c1"]
    call = db.get(LLMCall, current.llm_call_id)
    assert call.question_id == q1.id and call.run_id is None and call.purpose == "parse_rubric"
    # The model saw the teacher's rubric and the question's max score
    prompt = fake_llm.calls_of("parse_rubric")[0]["prompt"]
    assert "Maximum score: 4" in prompt and "Subtract 5\nDivide by 2" in prompt


async def test_question_without_a_rubric_gets_derived_criteria(fake_llm, db, school):
    q2 = questions(db, school["exam"])[1]

    await parse(q2)

    _, _, current = reload(q2.id)
    assert current.status == RubricStatus.READY and current.spec["derived"] is True
    assert "(none: derive the criteria from the question)" in fake_llm.calls_of("parse_rubric")[0]["prompt"]


async def test_spec_failing_the_checks_is_kept_as_invalid_with_reasons(fake_llm, db, school):
    fake_llm.parse_rubric = wrong_total
    q1 = questions(db, school["exam"])[0]

    await parse(q1)

    question, _, current = reload(q1.id)
    assert question.rubric_status == RubricStatus.INVALID and current.status == RubricStatus.INVALID
    assert any("add up to 3, but the question is worth 4" in e for e in current.validation_errors)
    assert current.spec["parser_warnings"] == ["The rubric's marks add up to 3, but the question is worth 4."]


async def test_parse_failure_marks_the_question_and_keeps_every_attempt(fake_llm, db, school):
    fake_llm.parse_rubric = lambda prompt: "not json"
    q1 = questions(db, school["exam"])[0]

    await parse(q1)

    question, specs, _ = reload(q1.id)
    assert question.rubric_status == RubricStatus.ERROR and question.rubric_error.startswith("Parsing failed")
    assert specs == []
    attempts = db.exec(select(LLMCall).where(LLMCall.question_id == q1.id)).all()
    assert [a.attempt_kind for a in attempts] == ["initial", "repair"]


async def test_stale_task_is_skipped(fake_llm, db, school):
    q1 = questions(db, school["exam"])[0]
    queued_hash = service.rubric_input_hash(q1)
    q1.rubric_criteria = "Subtract 5 (2 marks)\nDivide by 2 (2 marks)"
    db.add(q1)
    db.commit()

    await service.parse_question_rubric(q1.id, queued_hash)

    assert fake_llm.calls == []


async def test_parsed_inputs_are_not_parsed_again_unless_forced(fake_llm, db, school):
    q1 = questions(db, school["exam"])[0]
    await parse(q1)
    await parse(q1)  # redelivered task
    assert len(fake_llm.calls_of("parse_rubric")) == 1

    await parse(q1, force=True)  # teacher asked to re-parse

    _, specs, current = reload(q1.id)
    assert [s.version for s in specs] == [1, 2] and current.version == 2


async def test_result_is_discarded_if_the_question_changes_while_parsing(fake_llm, db, school):
    q1 = questions(db, school["exam"])[0]

    def teacher_edits_meanwhile(prompt):
        with Session(engine) as other:
            question = other.get(Question, q1.id)
            question.max_score = 5
            other.add(question)
            other.commit()
        return FakeInvoker._default_parse_rubric(prompt)

    fake_llm.parse_rubric = teacher_edits_meanwhile
    await parse(q1)

    _, specs, _ = reload(q1.id)
    assert specs == []


async def test_undoing_an_edit_reuses_the_earlier_spec(fake_llm, db, school):
    q1 = questions(db, school["exam"])[0]
    assert service.mark_changed(db, [q1]) == [(q1.id, service.rubric_input_hash(q1))]
    db.commit()
    await parse(q1)
    db.refresh(q1)
    original = q1.rubric_criteria

    q1.rubric_criteria = "Something else"
    assert len(service.mark_changed(db, [q1])) == 1 and q1.rubric_status == RubricStatus.PENDING
    q1.rubric_criteria = original
    assert service.mark_changed(db, [q1]) == [] and q1.rubric_status == RubricStatus.READY


async def test_failed_reparse_keeps_the_current_spec_in_use(fake_llm, db, school):
    q1 = questions(db, school["exam"])[0]
    await parse(q1)
    service.mark_reparse(db, q1)
    db.commit()
    fake_llm.parse_rubric = lambda prompt: "not json"

    await parse(q1, force=True)

    question, specs, current = reload(q1.id)
    assert question.rubric_status == RubricStatus.READY and current.version == 1 and len(specs) == 1
    assert question.rubric_error.startswith("Re-parse failed")


# ===== grading uses specs =====

async def test_invalid_spec_never_reaches_the_grader(fake_llm, db, school, tmp_path):
    from tests.test_audit import new_run, reload as reload_run

    fake_llm.parse_rubric = lambda p: wrong_total(p) if "Subtract 5" in p else FakeInvoker._default_parse_rubric(p)
    run = new_run(db, school["exam"], tmp_path)

    await service_run(run.id)

    run, _, submission, answers = reload_run(run.id)
    # Only that question escalates (for the teacher to fix its rubric); the other is graded
    assert run.status == "succeeded" and submission.status == SubmissionStatus.NEEDS_REVIEW
    assert sorted((a.status, a.escalation_reason) for a in answers) == [("escalated", "rubric_invalid"), ("graded", None)]
    assert not any("2x + 5" in c["prompt"] for c in fake_llm.calls_of("grade_answer"))


async def test_fixed_spec_lets_the_regrade_through(fake_llm, db, school, tmp_path):
    from app.rubrics.schema import RubricSpecEdit
    from tests.test_audit import new_run, reload as reload_run

    fake_llm.parse_rubric = lambda p: wrong_total(p) if "Subtract 5" in p else FakeInvoker._default_parse_rubric(p)
    await service_run(new_run(db, school["exam"], tmp_path).id)
    q1 = questions(db, school["exam"])[0]
    edit = RubricSpecEdit(kind="criteria", subject="math", criteria=[
        Criterion(id="c1", description="Subtracts 5", points=2), Criterion(id="c2", description="Divides by 2", points=2),
    ])
    record, errors = service.store_teacher_spec(db, q1, edit, membership_id=school["teacher_m"].id)
    assert errors == [] and record.source == "teacher" and record.version == 2

    run = new_run(db, school["exam"], tmp_path)
    await service_run(run.id)

    run, _, submission, _ = reload_run(run.id)
    assert run.status == "succeeded" and submission.status == SubmissionStatus.GRADED
    q1_prompt = next(c["prompt"] for c in fake_llm.calls_of("grade_answer") if "2x + 5" in c["prompt"])
    assert "[c1] Subtracts 5 (2 pts)" in q1_prompt


async def service_run(run_id):
    from app.services.grading_service import run_grading

    await run_grading(run_id)


async def test_reparse_admin_selects_only_outdated_ai_specs(fake_llm, db, school, capsys):
    from app.admin import reparse_specs

    q1, q2 = questions(db, school["exam"])[:2]
    await parse(q1)
    await parse(q2)
    with Session(engine) as s:
        record = service.current_spec(s, s.get(Question, q2.id))
        service.store_teacher_spec(
            s, s.get(Question, q2.id),
            RubricSpecEdit(kind=record.spec["kind"], subject=record.spec["subject"],
                           criteria=[Criterion(**c) for c in record.spec["criteria"]],
                           grading_notes=None),
            membership_id=None,
        )
        s.commit()
    with Session(engine) as s:
        assert reparse_specs.find_outdated(s) == []
        rec = service.current_spec(s, s.get(Question, q1.id))
        rec.parser_prompt_version = "old-version"
        s.add(rec)
        s.commit()
        assert [q.id for q in reparse_specs.find_outdated(s)] == [q1.id]
        assert [q.id for q in reparse_specs.find_outdated(s, school["org"].id)] == [q1.id]
    assert reparse_specs.run(dry_run=True) == 1
    assert "Dry run" in capsys.readouterr().out
    with Session(engine) as s:
        # Questions of a deleted exam are left alone
        exam = s.get(Exam, school["exam"].id)
        exam.deleted_at = utcnow()
        s.add(exam)
        s.commit()
        assert reparse_specs.find_outdated(s) == []
