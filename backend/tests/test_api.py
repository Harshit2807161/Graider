"""API tests for auth, tenancy checks, question management and submissions."""

import io
from pathlib import Path
from uuid import UUID

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.config import settings
from app.core.constants import Role, SubmissionStatus
from app.main import app
from app.models.audit import GradingRun
from app.models.document import Document
from app.models.exam import Question, Submission, SubmissionAnswer
from app.models.org import Batch
from app.models.user import User
from tests import ingestion_fixtures as fx
from tests.conftest import FIXTURES, add_member, make_org, make_user

API = settings.API_V1_STR


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def queued(monkeypatch):
    """Capture Celery dispatches instead of needing Redis."""
    calls = []
    from app.api.v1.endpoints import submissions
    monkeypatch.setattr(submissions.grade_submission_task, "delay", lambda *args: calls.append(args))
    return calls


def login(client, email, password="password123") -> dict:
    response = client.post(f"{API}/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def excel_file(rows: list[dict]) -> tuple:
    buffer = io.BytesIO()
    pd.DataFrame(rows).to_excel(buffer, index=False)
    return ("questions.xlsx", buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


class TestAuth:
    def test_bad_token_is_rejected(self, client):
        response = client.get(f"{API}/users/me", headers={"Authorization": "Bearer nope"})
        assert response.status_code == 401

    def test_roster_imported_user_without_password_cannot_log_in(self, client, db):
        db.add(User(email="new@school.test", full_name="New", hashed_password=None))
        db.commit()
        for password in ["", "changeme123!"]:
            response = client.post(f"{API}/auth/login", data={"username": "new@school.test", "password": password})
            assert response.status_code in (400, 422)


class TestTenancy:
    def test_teacher_sees_only_their_orgs(self, client, db, school):
        make_org(db, "other-school")
        headers = login(client, "teacher@school.test")

        response = client.get(f"{API}/orgs/", headers=headers)

        assert response.status_code == 200
        assert [o["slug"] for o in response.json()] == ["school"]

    def test_outsider_cannot_read_exam(self, client, db, school):
        other = make_org(db, "other-school")
        outsider = make_user(db, "outsider@other.test")
        add_member(db, outsider, other, Role.TEACHER)
        headers = login(client, "outsider@other.test")

        response = client.get(f"{API}/exams/{school['exam'].id}", headers=headers)
        assert response.status_code == 403

    def test_exam_list_ignores_batch_from_another_org(self, client, db, school):
        other = make_org(db, "other-school")
        foreign_batch = Batch(org_id=other.id, name="Foreign")
        db.add(foreign_batch)
        db.commit()
        school["exam"].batch_id = foreign_batch.id  # simulate bad data
        db.add(school["exam"])
        db.commit()
        outsider = make_user(db, "outsider@other.test")
        add_member(db, outsider, other, Role.TEACHER)

        response = client.get(
            f"{API}/exams/",
            params={"org_id": str(other.id), "batch_id": str(foreign_batch.id)},
            headers=login(client, "outsider@other.test"),
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_exam_cannot_use_another_orgs_batch(self, client, db, school):
        other = make_org(db, "other-school")
        foreign_batch = Batch(org_id=other.id, name="Foreign")
        db.add(foreign_batch)
        db.commit()

        response = client.post(
            f"{API}/exams/",
            json={"name": "X", "org_id": str(school["org"].id), "batch_id": str(foreign_batch.id)},
            headers=login(client, "teacher@school.test"),
        )
        assert response.status_code == 400

    def test_teacher_can_manage_class_roster(self, client, db, school):
        batch = Batch(org_id=school["org"].id, name="10-A")
        db.add(batch)
        db.commit()
        headers = login(client, "teacher@school.test")

        enroll = client.post(f"{API}/batches/{batch.id}/enroll", json={"email": "student@school.test"}, headers=headers)
        students = client.get(f"{API}/batches/{batch.id}/students", headers=headers)

        assert enroll.status_code == 200
        assert [s["membership_id"] for s in students.json()] == [str(school["student_m"].id)]


class TestQuestions:
    def test_exam_returns_ordered_live_questions(self, client, db, school):
        response = client.get(f"{API}/exams/{school['exam'].id}", headers=login(client, "teacher@school.test"))

        body = response.json()
        assert [q["question_text"] for q in body["questions"]] == ["Solve 2x + 5 = 15", "Explain photosynthesis"]
        assert body["question_count"] == 2

    def test_sync_updates_in_place_and_soft_deletes_removed(self, client, db, school):
        headers = login(client, "teacher@school.test")
        exam_id = school["exam"].id
        q1, q2 = client.get(f"{API}/exams/{exam_id}", headers=headers).json()["questions"]
        # A graded answer references q2; a hard delete would break its foreign key
        submission = Submission(exam_id=exam_id, original_file_url="x.png", status=SubmissionStatus.GRADED)
        db.add(submission)
        db.commit()
        db.add(SubmissionAnswer(submission_id=submission.id, question_id=q2["id"], score=3))
        db.commit()

        payload = [
            {**{k: q1[k] for k in ("id", "question_text", "order_index", "max_score", "question_type")},
             "question_text": "Solve 3x = 9"},
            {"question_text": "New question", "order_index": 2, "max_score": 5},
        ]
        response = client.post(f"{API}/exams/{exam_id}/questions", json=payload, headers=headers)

        assert response.status_code == 200, response.text
        live = response.json()
        assert [q["question_text"] for q in live] == ["Solve 3x = 9", "New question"]
        assert live[0]["id"] == q1["id"]
        db.expire_all()
        removed = db.exec(select(Question).where(Question.question_text == "Explain photosynthesis")).one()
        assert removed.deleted_at is not None

    def test_sync_rejects_foreign_question_ids(self, client, db, school):
        response = client.post(
            f"{API}/exams/{school['exam'].id}/questions",
            json=[{"id": "00000000-0000-0000-0000-000000000000", "question_text": "x", "order_index": 1, "max_score": 1}],
            headers=login(client, "teacher@school.test"),
        )
        assert response.status_code == 400

    def test_excel_import_is_all_or_nothing(self, client, db, school):
        rows = [
            {"question_text": "Valid", "max_score": 5, "question_type": "short_answer"},
            {"question_text": "Bad score", "max_score": "lots"},
            {"question_text": "Bad type", "max_score": 2, "question_type": "riddle"},
        ]
        response = client.post(
            f"{API}/exams/{school['exam'].id}/questions/upload",
            files={"file": excel_file(rows)},
            headers=login(client, "teacher@school.test"),
        )

        assert response.status_code == 400
        errors = response.json()["detail"]["errors"]
        assert len(errors) == 2 and errors[0].startswith("Row 3")
        db.expire_all()
        assert len(db.exec(select(Question).where(Question.deleted_at == None)).all()) == 2  # noqa: E711

    def test_excel_import_appends_after_existing_questions(self, client, db, school):
        rows = [{"question_text": "Essay", "max_score": 10, "question_type": "essay"}]
        response = client.post(
            f"{API}/exams/{school['exam'].id}/questions/upload",
            files={"file": excel_file(rows)},
            headers=login(client, "teacher@school.test"),
        )

        assert response.status_code == 200, response.text
        created = response.json()[0]
        assert created["order_index"] == 3
        assert created["question_type"] == "descriptive"


class TestRubricSpecs:
    @staticmethod
    def payload(questions: list[dict]) -> list[dict]:
        keys = ("id", "question_text", "order_index", "max_score", "rubric_criteria", "question_type")
        return [{k: q[k] for k in keys} for q in questions]

    def test_question_changes_queue_rubric_parses(self, client, db, school, rubric_parses):
        headers = login(client, "teacher@school.test")
        exam_id = school["exam"].id
        questions = client.get(f"{API}/exams/{exam_id}", headers=headers).json()["questions"]
        assert [q["rubric_status"] for q in questions] == ["missing", "missing"]

        # First save: neither question has been parsed yet
        body = client.post(f"{API}/exams/{exam_id}/questions", json=self.payload(questions), headers=headers).json()
        assert [q["rubric_status"] for q in body] == ["pending", "pending"]
        assert {UUID(args[0]) for args in rubric_parses} == {UUID(q["id"]) for q in questions}

        # Saving unchanged questions queues nothing
        client.post(f"{API}/exams/{exam_id}/questions", json=self.payload(body), headers=headers)
        assert len(rubric_parses) == 2

        # Editing one rubric and adding a question queues exactly those two
        body[0]["rubric_criteria"] = "Subtract 5 (2 marks)\nDivide by 2 (2 marks)"
        new = {"id": None, "question_text": "Define speed", "order_index": 3, "max_score": 2,
               "rubric_criteria": None, "question_type": "descriptive"}
        after = client.post(f"{API}/exams/{exam_id}/questions", json=self.payload(body) + [new], headers=headers).json()
        assert len(rubric_parses) == 4 and rubric_parses[2][0] == body[0]["id"]
        assert rubric_parses[3][0] == after[2]["id"] and rubric_parses[3][2] is False

    def test_excel_import_queues_a_parse_per_question(self, client, db, school, rubric_parses):
        headers = login(client, "teacher@school.test")
        rows = [{"question_text": "What is 2 + 2?", "max_score": 1, "rubric_criteria": "4"},
                {"question_text": "Name a mammal", "max_score": 1}]
        response = client.post(f"{API}/exams/{school['exam'].id}/questions/upload",
                               files={"file": excel_file(rows)}, headers=headers)
        assert response.status_code == 200, response.text
        assert [q["rubric_status"] for q in response.json()] == ["pending", "pending"] and len(rubric_parses) == 2

    def test_teacher_views_edits_and_reparses_a_spec(self, client, db, school, rubric_parses):
        headers = login(client, "teacher@school.test")
        exam_id = school["exam"].id
        q1, q2 = client.get(f"{API}/exams/{exam_id}", headers=headers).json()["questions"]
        url = f"{API}/exams/{exam_id}/questions/{q1['id']}/rubric-spec"

        missing = client.get(url, headers=headers)
        assert missing.status_code == 404 and missing.json()["detail"]["rubric_status"] == "missing"

        criteria = [{"id": "c1", "description": "Subtracts 5", "points": 2},
                    {"id": "c2", "description": "Divides by 2", "points": 1}]
        bad = client.put(url, json={"kind": "criteria", "subject": "math", "criteria": criteria}, headers=headers)
        assert bad.status_code == 422
        assert "Criteria points add up to 3, but the question is worth 4." in bad.json()["detail"]["errors"]

        criteria[1]["points"] = 2
        good = client.put(url, json={"kind": "criteria", "subject": "math", "criteria": criteria}, headers=headers)
        assert good.status_code == 200, good.text
        spec = good.json()
        assert spec["version"] == 1 and spec["source"] == "teacher" and spec["status"] == "ready"
        assert spec["created_by_membership_id"] == str(school["teacher_m"].id)
        assert client.get(url, headers=headers).json()["id"] == spec["id"]

        read_q1 = client.get(f"{API}/exams/{exam_id}", headers=headers).json()["questions"][0]
        assert read_q1["rubric_status"] == "ready" and read_q1["rubric_summary"] == "2 criteria (math)"
        overview = client.get(f"{API}/exams/{exam_id}/rubric-status", headers=headers).json()
        assert [(r["label"], r["rubric_status"], r["spec_version"]) for r in overview] == [
            ("Q1", "ready", 1), ("Q2", "missing", None)]

        reparse = client.post(f"{url}/reparse", headers=headers)
        assert reparse.status_code == 202 and reparse.json()["rubric_status"] == "pending"
        assert rubric_parses[-1][0] == q1["id"] and rubric_parses[-1][2] is True

    def test_rubric_specs_are_staff_only_and_scoped_to_the_exam(self, client, db, school):
        exam_id = school["exam"].id
        question_id = db.exec(select(Question).where(Question.exam_id == exam_id)).first().id
        url = f"{API}/exams/{exam_id}/questions/{question_id}/rubric-spec"

        student = login(client, "student@school.test")
        assert client.get(url, headers=student).status_code == 403
        assert client.get(f"{API}/exams/{exam_id}/rubric-status", headers=student).status_code == 403

        other = make_org(db, "other-school")
        add_member(db, make_user(db, "teacher@other.test"), other, Role.TEACHER)
        outsider = login(client, "teacher@other.test")
        assert client.get(url, headers=outsider).status_code == 403
        assert client.post(f"{url}/reparse", headers=outsider).status_code == 403

        teacher = login(client, "teacher@school.test")
        wrong_exam = client.get(f"{API}/exams/{exam_id}/questions/{UUID(int=1)}/rubric-spec", headers=teacher)
        assert wrong_exam.status_code == 404


class TestSubmissions:
    def upload(self, client, headers, exam_id, filename="sheet.png", data=None):
        content = data if data is not None else (FIXTURES / "test_answer.png").read_bytes()
        return client.post(
            f"{API}/exams/{exam_id}/submissions",
            files={"file": (filename, content, "image/png")},
            headers=headers,
        )

    def test_upload_queues_grading_with_a_safe_path(self, client, db, school, queued):
        response = self.upload(client, login(client, "teacher@school.test"), school["exam"].id, "../../evil.png")

        assert response.status_code == 200, response.text
        stored = Path(response.json()["original_file_url"]).resolve()
        assert "evil" not in stored.name and stored.suffix == ".png"  # generated name, never the client's
        assert stored.is_relative_to(settings.UPLOAD_DIR.resolve())
        (document,) = db.exec(select(Document).where(Document.submission_id == UUID(response.json()["id"]))).all()
        assert document.original_filename == "evil.png" and document.kind == "png" and document.position == 0
        # The task carries only the id of the grading run created for this upload
        assert len(queued) == 1
        run = db.get(GradingRun, UUID(queued[0][0]))
        assert str(run.submission_id) == response.json()["id"] and run.trigger == "upload"

    def test_two_uploads_with_same_name_do_not_overwrite(self, client, school, queued):
        headers = login(client, "teacher@school.test")
        first = self.upload(client, headers, school["exam"].id).json()
        second = self.upload(client, headers, school["exam"].id).json()
        assert first["original_file_url"] != second["original_file_url"]

    @pytest.mark.parametrize(
        "filename, make, reason",
        [
            ("sheet.exe", lambda: b"MZ", "Unsupported file type"),
            ("sheet.png", lambda: b"", "empty"),
            ("sheet.pdf", lambda: fx.image_bytes("PNG"), "don't match its extension"),
            ("sheet.docx", fx.macro_docx, "macros"),
            ("sheet.pdf", fx.encrypted_pdf, "password-protected"),
            ("sheet.pdf", lambda: b"%PDF-1.7 broken", "damaged"),
        ],
    )
    def test_rejects_bad_files_with_the_reason(self, client, db, school, queued, filename, make, reason):
        response = self.upload(client, login(client, "teacher@school.test"), school["exam"].id, filename, make())
        assert response.status_code == 400 and reason in response.json()["detail"]
        assert response.json()["detail"].startswith(filename)
        assert queued == [] and db.exec(select(Document)).all() == []

    def test_office_files_need_the_converter(self, client, school, queued, monkeypatch):
        monkeypatch.setattr(settings, "GOTENBERG_URL", None)
        response = self.upload(client, login(client, "teacher@school.test"), school["exam"].id, "a.docx", fx.docx())
        assert response.status_code == 400 and "can't be converted on this server" in response.json()["detail"]

    def test_several_files_make_one_submission_in_page_order(self, client, db, school, queued, monkeypatch):
        monkeypatch.setattr(settings, "GOTENBERG_URL", "http://converter.invalid")
        files = [
            ("files", ("page1.HEIC", fx.HEIC_PHOTO.read_bytes(), "image/heic")),
            ("files", ("page2.jpg", fx.rotated_jpeg_with_exif(), "image/jpeg")),
            ("files", ("extra.docx", fx.docx(), "application/octet-stream")),
            ("files", ("notes.txt", fx.text(), "text/plain")),
        ]
        response = client.post(f"{API}/exams/{school['exam'].id}/submissions", files=files,
                               headers=login(client, "teacher@school.test"))

        assert response.status_code == 200, response.text
        documents = db.exec(select(Document).where(Document.submission_id == UUID(response.json()["id"]))
                            .order_by(Document.position)).all()
        assert [(d.original_filename, d.kind) for d in documents] == [
            ("page1.HEIC", "heic"), ("page2.jpg", "jpeg"), ("extra.docx", "docx"), ("notes.txt", "txt")]
        assert len(queued) == 1

    def test_too_many_files_are_refused(self, client, school, queued, monkeypatch):
        monkeypatch.setattr(settings, "MAX_FILES_PER_SUBMISSION", 2)
        files = [("files", (f"p{i}.png", fx.image_bytes("PNG"), "image/png")) for i in range(3)]
        response = client.post(f"{API}/exams/{school['exam'].id}/submissions", files=files,
                               headers=login(client, "teacher@school.test"))
        assert response.status_code == 400 and "At most 2 files" in response.json()["detail"]

    def test_rejects_student_from_another_org(self, client, db, school, queued):
        other = make_org(db, "other-school")
        stranger = make_user(db, "stranger@other.test")
        stranger_m = add_member(db, stranger, other, Role.STUDENT)

        response = client.post(
            f"{API}/exams/{school['exam'].id}/submissions",
            files={"file": ("sheet.png", (FIXTURES / "test_answer.png").read_bytes(), "image/png")},
            data={"student_id": str(stranger_m.id)},
            headers=login(client, "teacher@school.test"),
        )
        assert response.status_code == 400

    def test_students_cannot_upload_or_list(self, client, school, queued):
        headers = login(client, "student@school.test")
        assert self.upload(client, headers, school["exam"].id).status_code == 403
        assert client.get(f"{API}/exams/{school['exam'].id}/submissions", headers=headers).status_code == 403

    def test_list_and_read_expose_progress(self, client, school, queued):
        headers = login(client, "teacher@school.test")
        created = self.upload(client, headers, school["exam"].id).json()

        listed = client.get(f"{API}/exams/{school['exam'].id}/submissions", headers=headers).json()
        detail = client.get(f"{API}/submissions/{created['id']}", headers=headers).json()

        assert [s["id"] for s in listed] == [created["id"]]
        assert detail["status"] == "PENDING"
        assert "current_step" in detail and detail["answers"] == []

    def test_regrade_creates_a_new_run(self, client, db, school, queued):
        headers = login(client, "teacher@school.test")
        created = self.upload(client, headers, school["exam"].id).json()
        db.exec(select(Submission).where(Submission.id == UUID(created["id"]))).one().status = SubmissionStatus.FAILED
        db.commit()

        response = client.post(f"{API}/submissions/{created['id']}/regrade", headers=headers)

        assert response.status_code == 200
        runs = db.exec(select(GradingRun).where(GradingRun.submission_id == UUID(created["id"]))).all()
        assert sorted(r.trigger for r in runs) == ["regrade", "upload"]
        assert len(queued) == 2

    def test_regrade_is_refused_while_in_progress(self, client, school, queued):
        headers = login(client, "teacher@school.test")
        created = self.upload(client, headers, school["exam"].id).json()

        response = client.post(f"{API}/submissions/{created['id']}/regrade", headers=headers)
        assert response.status_code == 409


def test_question_labels_must_be_unique(client, school):
    headers = login(client, "teacher@school.test")
    questions = [{"question_text": "a", "order_index": 1, "max_score": 1, "label": "1"},
                 {"question_text": "b", "order_index": 2, "max_score": 1, "label": "1"}]
    response = client.post(f"{API}/exams/{school['exam'].id}/questions", json=questions, headers=headers)
    assert response.status_code == 400 and "labels must be unique: 1" in response.json()["detail"]


class TestGradingSettings:
    def test_defaults_then_partial_updates_keep_the_rest_of_the_config(self, client, db, school):
        exam = school["exam"]
        exam.config = {"choice_groups": [{"id": "g1", "labels": ["Q1", "Q2"], "pick": 1}]}
        db.add(exam)
        db.commit()
        headers = login(client, "teacher@school.test")
        url = f"{API}/exams/{exam.id}/grading-settings"

        assert client.get(url, headers=headers).json() == {
            "agreement_threshold": 0.8, "spot_check_rate": 0.0, "choice_policy": "best"}
        response = client.patch(url, json={"spot_check_rate": 0.1}, headers=headers)
        assert response.json() == {"agreement_threshold": 0.8, "spot_check_rate": 0.1, "choice_policy": "best"}
        db.refresh(exam)
        assert exam.config["choice_groups"] and exam.config["spot_check_rate"] == 0.1

    @pytest.mark.parametrize("body", [{"agreement_threshold": 0.3}, {"spot_check_rate": 1.5},
                                      {"choice_policy": "worst"}, {"max_revisions": 5}])
    def test_out_of_range_or_unknown_settings_are_rejected(self, client, school, body):
        response = client.patch(f"{API}/exams/{school['exam'].id}/grading-settings", json=body,
                                headers=login(client, "teacher@school.test"))
        assert response.status_code == 422

    def test_students_cannot_read_or_change_them(self, client, school):
        url = f"{API}/exams/{school['exam'].id}/grading-settings"
        headers = login(client, "student@school.test")
        assert client.get(url, headers=headers).status_code == 403
        assert client.patch(url, json={"spot_check_rate": 1.0}, headers=headers).status_code == 403
