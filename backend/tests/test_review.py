"""The review workflow API (Proposal 002 §9): overrides, resolving escalations, transcript edits,
approval and publishing, on submissions graded by the real pipeline with fake models."""

from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.constants import Role
from app.core.constants import SubmissionStatus as S
from app.core.db import engine
from app.main import app
from app.models.audit import GradingRun
from app.models.exam import Exam, Question, Submission
from app.models.grade_event import GradeEvent
from app.models.grading import AnswerGrade, Transcription
from app.services.grading_service import run_grading
from tests.conftest import FakeInvoker, add_member, make_exam, make_org, make_user
from tests.test_pipeline import grade, load, make_submission, page, segment

API = settings.API_V1_STR


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def queued(monkeypatch):
    """Capture Celery dispatches instead of needing Redis."""
    calls = []
    from app.worker import grade_submission_task
    monkeypatch.setattr(grade_submission_task, "delay", lambda *args: calls.append(args))
    return calls


def login(client, email, password="password123") -> dict:
    response = client.post(f"{API}/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def graded(db, school, tmp_path, **config) -> Submission:
    """A submission of the school's exam (Q1 out of 4, Q2 out of 6), graded by the pipeline."""
    if config:
        exam = db.get(Exam, school["exam"].id)
        exam.config = config
        db.add(exam)
        db.commit()
    submission = make_submission(db, school["exam"], tmp_path)
    await grade(submission)
    return load(submission.id)[0]


def current(submission_id, order_index: int) -> AnswerGrade:
    with Session(engine) as db:
        return db.exec(select(AnswerGrade).join(Question, Question.id == AnswerGrade.question_id).where(
            AnswerGrade.submission_id == submission_id, AnswerGrade.is_current == True,  # noqa: E712
            Question.order_index == order_index)).one()


def question_id(school, order_index: int):
    with Session(engine) as db:
        return db.exec(select(Question.id).where(
            Question.exam_id == school["exam"].id, Question.order_index == order_index)).one()


def events(submission_id) -> list[tuple]:
    with Session(engine) as db:
        rows = db.exec(select(GradeEvent).where(GradeEvent.submission_id == submission_id)
                       .order_by(GradeEvent.created_at)).all()
        return [(e.kind, e.reason) for e in rows]


def answer_url(submission, school, order_index, action):
    return f"{API}/submissions/{submission.id}/answers/{question_id(school, order_index)}/{action}"


def override(client, headers, submission, school, order_index, score, reason="Method shown, answer wrong", **body):
    grade_id = current(submission.id, order_index).id
    return client.post(answer_url(submission, school, order_index, "override"), headers=headers, json={
        "expected_grade_id": str(grade_id), "criteria": [{"id": "c1", "score": score}], "reason": reason, **body})


def resolve(client, headers, submission, school, order_index):
    grade_id = current(submission.id, order_index).id
    return client.post(answer_url(submission, school, order_index, "resolve"), headers=headers,
                       json={"expected_grade_id": str(grade_id)})


async def test_overrides_and_resolutions_add_teacher_versions_until_the_review_is_complete(
        fake_llm, db, school, tmp_path, client):
    submission = await graded(db, school, tmp_path, spot_check_rate=1.0)  # both answers escalate, scores kept
    assert submission.status == S.NEEDS_REVIEW and submission.total_score == 10
    headers = login(client, "teacher@school.test")
    ai_grade = current(submission.id, 1)

    response = override(client, headers, submission, school, 1, 2.5, feedback="Check the last step.")
    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["grade"]["source"], body["grade"]["status"], body["grade"]["score"], body["grade"]["version"]) == (
        "teacher", "graded", 2.5, 2)
    assert body["grade"]["override_reason"] == "Method shown, answer wrong"
    assert body["grade"]["criteria"][0]["justification"] == "Set by the teacher: Method shown, answer wrong"
    assert body["submission"]["status"] == "NEEDS_REVIEW" and body["submission"]["total_score"] == 8.5

    # The AI's version is kept, no longer current; the projection follows the teacher's
    with Session(engine) as s:
        old = s.get(AnswerGrade, ai_grade.id)
        assert (old.is_current, old.score, old.source) == (False, 4, "ai")
    _, answers = load(submission.id)
    assert [(a.score, a.feedback, a.status) for a, _ in answers][0] == (2.5, "Check the last step.", "graded")

    assert resolve(client, headers, submission, school, 2).status_code == 200
    submission, _ = load(submission.id)
    assert (submission.status, submission.total_score) == (S.GRADED, 8.5)
    assert [kind for kind, _ in events(submission.id)] == ["override", "resolve", "review_complete"]


@pytest.mark.parametrize("criteria, message", [
    ([{"id": "c1", "score": 5}], "c1: score 5 is outside 0..4."),
    ([{"id": "c1", "score": 1}, {"id": "c9", "score": 0}], "Unknown criteria: c9."),
    ([{"id": "c1", "score": 1}, {"id": "c1", "score": 1}], "Score each criterion once: c1 appear more than once."),
])
async def test_overrides_pass_the_same_score_checks_as_the_model(
        fake_llm, db, school, tmp_path, client, criteria, message):
    submission = await graded(db, school, tmp_path)
    response = client.post(answer_url(submission, school, 1, "override"), headers=login(client, "teacher@school.test"),
                           json={"expected_grade_id": str(current(submission.id, 1).id), "criteria": criteria,
                                 "reason": "Recheck"})
    assert response.status_code == 422 and message in response.json()["detail"]
    assert current(submission.id, 1).version == 1 and events(submission.id) == []


async def test_an_override_needs_a_reason_and_the_grade_the_teacher_saw(fake_llm, db, school, tmp_path, client):
    submission = await graded(db, school, tmp_path)
    headers = login(client, "teacher@school.test")

    assert override(client, headers, submission, school, 1, 2, reason="   ").status_code == 422
    stale = current(submission.id, 1).id
    assert override(client, headers, submission, school, 1, 2).status_code == 200
    response = client.post(answer_url(submission, school, 1, "override"), headers=headers, json={
        "expected_grade_id": str(stale), "criteria": [{"id": "c1", "score": 3}], "reason": "Mine"})
    assert response.status_code == 409 and "changed since you loaded it" in response.json()["detail"]
    assert current(submission.id, 1).score == 2


async def test_an_answer_without_a_proposed_score_is_scored_by_the_teacher(fake_llm, db, school, tmp_path, client):
    fake_llm.transcribe = lambda prompt: page(segment("Q1", "2x = 10 so x = 5"))  # Q2 left blank
    submission = await graded(db, school, tmp_path)
    assert current(submission.id, 2).escalation_reason == "no_answer_found"
    headers = login(client, "teacher@school.test")

    response = resolve(client, headers, submission, school, 2)
    assert response.status_code == 409 and "no proposed score" in response.json()["detail"]
    assert resolve(client, headers, submission, school, 1).status_code == 409  # Q1 isn't escalated

    assert override(client, headers, submission, school, 2, 0, reason="Left blank").status_code == 200
    submission, _ = load(submission.id)
    assert (submission.status, submission.total_score) == (S.GRADED, 4)


async def test_approval_waits_for_every_review_and_can_be_withdrawn(fake_llm, db, school, tmp_path, client):
    submission = await graded(db, school, tmp_path, spot_check_rate=1.0)
    headers = login(client, "teacher@school.test")
    approve = f"{API}/submissions/{submission.id}/approve"

    response = client.post(approve, headers=headers)
    assert response.status_code == 409 and response.json()["detail"] == "2 answer(s) still need review."
    resolve(client, headers, submission, school, 1)
    resolve(client, headers, submission, school, 2)

    assert client.post(approve, headers=headers, json={"reason": "Checked"}).json()["status"] == "APPROVED"
    assert override(client, headers, submission, school, 1, 1).status_code == 409  # unapprove first
    response = client.post(f"{API}/submissions/{submission.id}/unapprove", headers=headers)
    assert response.json()["status"] == "GRADED"
    assert [kind for kind, _ in events(submission.id)][-2:] == ["approve", "unapprove"]
    assert ("approve", "Checked") in events(submission.id)


async def test_publishing_releases_only_approved_submissions_and_is_final(fake_llm, db, school, tmp_path, client, queued):
    headers = login(client, "teacher@school.test")
    approved = await graded(db, school, tmp_path)
    client.post(f"{API}/submissions/{approved.id}/approve", headers=headers)
    waiting = await graded(db, school, tmp_path)  # graded, not approved

    response = client.post(f"{API}/exams/{school['exam'].id}/publish", headers=headers)
    assert response.json() == {"published": 1, "not_approved": 1}
    assert load(approved.id)[0].status == S.PUBLISHED and load(waiting.id)[0].status == S.GRADED

    assert override(client, headers, approved, school, 1, 1).status_code == 409
    assert client.post(f"{API}/submissions/{approved.id}/regrade", headers=headers).status_code == 409
    assert client.post(f"{API}/submissions/{approved.id}/unapprove", headers=headers).status_code == 409
    assert queued == []


async def test_a_transcript_edit_regrades_that_question_from_the_teachers_text(
        fake_llm, db, school, tmp_path, client, queued):
    submission = await graded(db, school, tmp_path)
    headers = login(client, "teacher@school.test")
    client.post(f"{API}/submissions/{submission.id}/approve", headers=headers)
    other = current(submission.id, 2).id

    response = client.patch(answer_url(submission, school, 1, "transcript"), headers=headers,
                            json={"text": "2x = 10\nx = 5", "reason": "Misread the last line"})
    assert response.status_code == 200 and response.json()["status"] == "PENDING"  # the approval is cleared
    (run_id,), = queued
    with Session(engine) as s:
        run = s.get(GradingRun, UUID(run_id))
        assert (run.trigger, run.question_ids) == ("transcript_edit", [str(question_id(school, 1))])
        teacher = s.exec(select(Transcription).where(Transcription.is_current == True,  # noqa: E712
                                                     Transcription.question_id == question_id(school, 1))).one()
        assert (teacher.source, teacher.version, teacher.text) == ("teacher", 2, "2x = 10\nx = 5")
        event = s.exec(select(GradeEvent).where(GradeEvent.kind == "transcript_edit")).one()
        assert (event.run_id, event.before["status"], event.after["text"]) == (run.id, "APPROVED", "2x = 10\nx = 5")

    await run_grading(run.id)
    assert "2x = 10\nx = 5" in fake_llm.calls_of("grade_answer")[-1]["prompt"]
    assert current(submission.id, 1).version == 2 and current(submission.id, 2).id == other
    assert load(submission.id)[0].status == S.GRADED


async def test_nothing_can_be_changed_while_the_submission_is_being_graded(fake_llm, db, school, tmp_path, client, queued):
    submission = await graded(db, school, tmp_path)
    headers = login(client, "teacher@school.test")
    assert client.post(f"{API}/submissions/{submission.id}/regrade", headers=headers,
                       json={"reason": "Rubric fixed"}).json()["status"] == "PENDING"
    assert ("regrade_requested", "Rubric fixed") in events(submission.id)

    response = client.patch(answer_url(submission, school, 1, "transcript"), headers=headers,
                            json={"text": "x = 5", "reason": "Misread"})
    assert response.status_code == 409 and "the submission is PENDING" in response.json()["detail"]
    assert override(client, headers, submission, school, 1, 1).status_code == 409
    assert client.post(f"{API}/submissions/{submission.id}/regrade", headers=headers).status_code == 409
    assert len(queued) == 1


async def test_review_actions_are_for_staff_of_the_same_org(fake_llm, db, school, tmp_path, client):
    submission = await graded(db, school, tmp_path, spot_check_rate=1.0)
    other_org = make_org(db, "other")
    outsider = add_member(db, make_user(db, "teacher@other.test"), other_org, Role.TEACHER)
    other_exam = make_exam(db, other_org, outsider, [{"question_text": "Elsewhere", "max_score": 1}])
    foreign_question = db.exec(select(Question.id).where(Question.exam_id == other_exam.id)).one()

    for email in ("teacher@other.test", "student@school.test"):
        headers = login(client, email)
        assert resolve(client, headers, submission, school, 1).status_code in (403, 404)
        assert client.post(f"{API}/submissions/{submission.id}/approve", headers=headers).status_code in (403, 404)
        assert client.post(f"{API}/exams/{school['exam'].id}/publish", headers=headers).status_code in (403, 404)
    response = client.post(f"{API}/submissions/{submission.id}/answers/{foreign_question}/resolve",
                           headers=login(client, "teacher@school.test"),
                           json={"expected_grade_id": str(current(submission.id, 1).id)})
    assert response.status_code == 404
    assert events(submission.id) == []


# ===== what teachers review =====

async def test_the_queue_puts_escalations_first_then_the_least_agreed_grades(fake_llm, db, school, tmp_path, client):
    def review(prompt):
        out = FakeInvoker._default_review(prompt)
        return {**out, "agreement": 0.85} if "Question Q2 (" in prompt else out
    fake_llm.review = review
    first = await graded(db, school, tmp_path)  # Q1 agreed at 0.95, Q2 at 0.85
    first_row = db.get(Submission, first.id)
    first_row.student_membership_id = school["student_m"].id
    db.add(first_row)
    db.commit()
    fake_llm.transcribe = lambda prompt: page(segment("Q1", "x = 5"))
    second = await graded(db, school, tmp_path)  # Q2 blank: escalated
    headers = login(client, "teacher@school.test")
    override(client, headers, first, school, 1, 3)  # teacher decisions leave the queue

    queue = client.get(f"{API}/exams/{school['exam'].id}/review-queue", headers=headers).json()
    assert [(i["submission_id"], i["question_label"], i["status"], i["agreement"]) for i in queue] == [
        (str(second.id), "Q2", "escalated", None), (str(first.id), "Q2", "graded", 0.85),
        (str(second.id), "Q1", "graded", 0.95)]
    assert queue[0]["escalation_reason"] == "no_answer_found" and queue[1]["student_name"] == "student"
    escalated = client.get(f"{API}/exams/{school['exam'].id}/review-queue?escalated_only=true", headers=headers).json()
    assert [i["question_label"] for i in escalated] == ["Q2"]
    assert client.get(f"{API}/exams/{school['exam'].id}/review-queue",
                      headers=login(client, "student@school.test")).status_code == 403


async def test_the_review_shows_pages_spec_transcript_grade_and_earlier_versions(fake_llm, db, school, tmp_path, client):
    submission = await graded(db, school, tmp_path)
    headers = login(client, "teacher@school.test")
    override(client, headers, submission, school, 1, 3)

    review = client.get(f"{API}/submissions/{submission.id}/review", headers=headers).json()
    assert review["pages"] == [{"number": 1, "document_id": review["pages"][0]["document_id"], "page_index": 0,
                                "kind": review["pages"][0]["kind"], "width": review["pages"][0]["width"],
                                "height": review["pages"][0]["height"], "has_image": True}]
    q1, q2 = review["questions"]
    assert (q1["label"], q1["max_score"], q1["transcription"]["text"]) == ("Q1", 4, "student answer for Q1")
    assert [c["id"] for c in q1["rubric_spec"]["spec"]["criteria"]] == ["c1"]
    assert (q1["grade"]["source"], q1["grade"]["score"]) == ("teacher", 3)
    assert [(g["version"], g["source"], len(g["rounds"])) for g in q1["previous_grades"]] == [(1, "ai", 1)]
    assert q2["previous_grades"] == [] and q2["grade"]["rounds"][0]["effective_agreement"] == 0.95
    assert review["unassigned_segments"] == []


async def test_page_images_are_served_to_staff_only(fake_llm, db, school, tmp_path, client):
    submission = await graded(db, school, tmp_path)
    url = f"{API}/submissions/{submission.id}/pages"
    response = client.get(f"{url}/1/image", headers=login(client, "teacher@school.test"))
    assert response.status_code == 200 and response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, no-store" and response.content[:2] == b"\xff\xd8"
    assert client.get(f"{url}/2/image", headers=login(client, "teacher@school.test")).status_code == 404
    assert client.get(f"{url}/1/image", headers=login(client, "student@school.test")).status_code == 403


async def test_the_timeline_shows_runs_calls_versions_and_actions_in_order(fake_llm, db, school, tmp_path, client):
    submission = await graded(db, school, tmp_path)
    headers = login(client, "teacher@school.test")
    override(client, headers, submission, school, 1, 3, reason="Final line wrong")

    timeline = client.get(f"{API}/submissions/{submission.id}/timeline", headers=headers).json()
    kinds = [(e["type"], e["question_label"]) for e in timeline]
    assert kinds[0] == ("run", None) and kinds[-2:] == [("grade", "Q1"), ("event", "Q1")]
    calls = [e["data"]["purpose"] for e in timeline if e["type"] == "llm_call"]
    assert calls.count("transcribe_page") == 1 and calls.count("grade") == 2 and calls.count("evaluate") == 2
    assert "request" not in timeline[1]["data"]
    assert timeline[-1]["data"]["reason"] == "Final line wrong"
    assert timeline[-1]["actor_membership_id"] == str(school["teacher_m"].id)

    # Raw model requests and responses are for owners and admins
    url = f"{API}/submissions/{submission.id}/timeline?bodies=true"
    assert client.get(url, headers=headers).status_code == 403
    add_member(db, make_user(db, "admin@school.test"), school["org"], Role.ADMIN)
    calls = [e for e in client.get(url, headers=login(client, "admin@school.test")).json() if e["type"] == "llm_call"]
    assert all("request" in e["data"] and "response" in e["data"] for e in calls)


async def test_students_see_only_their_own_published_scores_and_feedback(fake_llm, db, school, tmp_path, client):
    submission = await graded(db, school, tmp_path)
    row = db.get(Submission, submission.id)
    row.student_membership_id = school["student_m"].id
    db.add(row)
    db.commit()
    add_member(db, make_user(db, "classmate@school.test"), school["org"], Role.STUDENT)
    url = f"{API}/submissions/{submission.id}"
    student, teacher = login(client, "student@school.test"), login(client, "teacher@school.test")

    assert client.get(url, headers=student).status_code == 404  # graded, not published
    client.post(f"{url}/approve", headers=teacher)
    assert client.get(url, headers=student).status_code == 404  # approved, not published
    client.post(f"{API}/exams/{school['exam'].id}/publish", headers=teacher)

    view = client.get(url, headers=student).json()
    assert set(view) == {"id", "exam_id", "status", "total_score", "max_score", "percentage", "answers"}
    assert [(a["label"], a["score"], a["max_score"], a["counted"]) for a in view["answers"]] == [
        ("Q1", 4, 4, True), ("Q2", 6, 6, True)]
    assert set(view["answers"][0]) == {"question_id", "label", "question_text", "score", "max_score", "counted",
                                       "feedback"}
    assert client.get(url, headers=login(client, "classmate@school.test")).status_code == 404

    full = client.get(url, headers=teacher).json()
    assert "original_file_url" in full and full["answers"][0]["reasoning"] and full["answers"][0]["status"] == "graded"
