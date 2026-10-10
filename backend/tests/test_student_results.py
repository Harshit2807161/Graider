"""What students can see: their own published results, the pages of their own answer sheets, and nothing
of anyone else's."""

import pytest
from fastapi.testclient import TestClient

from app.core.constants import Role
from app.main import app
from app.models.exam import Submission
from tests.conftest import add_member, make_user
from tests.test_review import API, graded, login


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


async def sheet_of(db, school, tmp_path, membership):
    submission = await graded(db, school, tmp_path)
    row = db.get(Submission, submission.id)
    row.student_membership_id = membership.id
    db.add(row)
    db.commit()
    return row


def test_organizations_say_which_role_the_user_has(client, school):
    for email, role in (("teacher@school.test", "teacher"), ("student@school.test", "student")):
        orgs = client.get(f"{API}/orgs/", headers=login(client, email)).json()
        assert [(o["name"], o["role"]) for o in orgs] == [("School", role)]


async def test_a_student_lists_only_their_own_published_results(fake_llm, db, school, tmp_path, client):
    mine = await sheet_of(db, school, tmp_path, school["student_m"])
    classmate = add_member(db, make_user(db, "classmate@school.test"), school["org"], Role.STUDENT)
    await sheet_of(db, school, tmp_path, classmate)
    student, teacher = login(client, "student@school.test"), login(client, "teacher@school.test")

    assert client.get(f"{API}/submissions/mine", headers=student).json() == {"results": [], "awaiting": 1}

    client.post(f"{API}/submissions/{mine.id}/approve", headers=teacher)
    client.post(f"{API}/exams/{school['exam'].id}/publish", headers=teacher)
    listed = client.get(f"{API}/submissions/mine", headers=student).json()
    assert listed["awaiting"] == 0
    assert [(r["submission_id"], r["exam_name"], r["total_score"], r["max_score"]) for r in listed["results"]] == [
        (str(mine.id), "Unit Test", 10, 10)]
    assert listed["results"][0]["published_at"]

    # The classmate's sheet isn't published, and staff have no student results of their own
    assert client.get(f"{API}/submissions/mine", headers=login(client, "classmate@school.test")).json() == {
        "results": [], "awaiting": 1}
    assert client.get(f"{API}/submissions/mine", headers=teacher).json() == {"results": [], "awaiting": 0}


async def test_a_student_sees_the_pages_of_their_own_published_sheet_only(fake_llm, db, school, tmp_path, client):
    mine = await sheet_of(db, school, tmp_path, school["student_m"])
    student, teacher = login(client, "student@school.test"), login(client, "teacher@school.test")
    page = f"{API}/submissions/{mine.id}/pages/1/image"

    assert client.get(page, headers=student).status_code == 404  # not published yet
    client.post(f"{API}/submissions/{mine.id}/approve", headers=teacher)
    client.post(f"{API}/exams/{school['exam'].id}/publish", headers=teacher)

    response = client.get(page, headers=student)
    assert response.status_code == 200 and response.headers["cache-control"] == "private, no-store"
    view = client.get(f"{API}/submissions/{mine.id}", headers=student).json()
    assert (view["exam_name"], view["pages"]) == ("Unit Test", 1) and view["published_at"]

    add_member(db, make_user(db, "classmate@school.test"), school["org"], Role.STUDENT)
    assert client.get(page, headers=login(client, "classmate@school.test")).status_code == 404
    assert client.get(f"{API}/submissions/{mine.id}/review", headers=student).status_code == 403
