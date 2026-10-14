"""Exam documents (M4c): question labels, exam drafts from question papers / rubrics / blank copies."""

from uuid import uuid4

import pytest

from app.models.exam import Question
from app.services.labels import ChoiceGroup, choice_groups, duplicate_labels, exam_labels


# ===== labels =====

def q(label=None):
    return Question(exam_id=uuid4(), question_text="t", order_index=0, max_score=1, label=label)


def test_paper_labels_are_used_when_every_question_has_a_unique_one():
    assert exam_labels([q("1"), q("2(a)"), q("2(b)")]) == ["1", "2(a)", "2(b)"]


@pytest.mark.parametrize("labels", [[None, "2"], ["1", "1"], [None, None]])
def test_otherwise_q1_to_qn_for_all(labels):
    assert exam_labels([q(label) for label in labels]) == ["Q1", "Q2"]


def test_choice_groups_and_duplicates():
    groups = choice_groups({"choice_groups": [{"id": "g1", "labels": ["5", "6"], "pick": 1, "note": "either 5 or 6"}]})
    assert groups == [ChoiceGroup(id="g1", labels=["5", "6"], pick=1, note="either 5 or 6")]
    assert choice_groups({}) == []
    assert duplicate_labels(["1", None, "2", "1", None]) == ["1"]


async def test_grading_uses_the_papers_labels(fake_llm, db, school, tmp_path):
    from tests.test_audit import new_run
    from app.services.grading_service import run_grading

    for question, label in zip(sorted(school["exam"].questions, key=lambda x: x.order_index), ["1", "2(a)"]):
        question.label = label
        db.add(question)
    db.commit()

    await run_grading(new_run(db, school["exam"], tmp_path).id)

    read_schema = fake_llm.calls_of("transcribe")[0]["request"].json_schema
    assert read_schema["properties"]["segments"]["items"]["properties"]["label"]["enum"] == ["1", "2(a)", "unassigned"]
    assert {c["request"].trace_metadata.get("question") for c in fake_llm.calls_of("grade_answer")} == {"1", "2(a)"}


# ===== merging pages and checking drafts (pure code) =====

from app.exam_drafts.checks import check_content, check_pages, expected_total  # noqa: E402
from app.exam_drafts.merge import PageInput, attach_rubric, merge  # noqa: E402
from app.exam_drafts.schema import (  # noqa: E402
    DraftQuestion,
    PageChoiceGroup,
    PageExtraction,
    PageQuestion,
    PageRubricItem,
)


def pq(label, text, marks=None, continued=False, context=None, kind="descriptive"):
    return PageQuestion(label=label, printed_label=f"Q.{label}", context=context, text=text, marks=marks,
                        question_type=kind, continued=continued)


def pr(label, text, marks=None, continued=False):
    return PageRubricItem(label=label, printed_label=label, text=text, marks=marks, continued=continued)


def page(role, *, questions=(), rubric=(), groups=(), kind=None, handwriting=False, total=None, index=0, doc="d1"):
    extraction = PageExtraction(
        page_kind=kind or ("rubric" if role == "rubric" else "question_paper"), has_handwriting=handwriting,
        instructions=None, total_marks=total, questions=list(questions), rubric_items=list(rubric),
        choice_groups=list(groups),
    )
    return PageInput(document_id=doc, page_index=index, declared_role=role, extraction=extraction)


def codes(issues):
    return sorted((i.severity, i.code, i.label) for i in issues)


def test_question_paper_and_separate_rubric_merge_into_one_draft():
    pages = [
        page("question_paper", total=6, questions=[pq("1", "Solve 2x + 5 = 15.", 2), pq("2(a)", "Define speed.", 1, context="Motion")]),
        page("question_paper", index=1, questions=[pq("2(a)", "Give its SI unit.", continued=True), pq("2(b)", "A car ...", 3, context="Motion")]),
        # A marking scheme that repeats the questions: only its rubric items are used
        page("rubric", doc="d2", questions=[pq("1", "repeated")], rubric=[pr("1", "x = 5 (2)"), pr("2 (a)", "distance/time (1)"), pr("2(b)", "40 km/h (3)")]),
    ]

    content, pieces = merge(pages)
    attach_rubric(content, pieces, {i: p.label for i, p in enumerate(pieces)})

    assert content.mode == "questions" and [q.label for q in content.questions] == ["1", "2(a)", "2(b)"]
    assert content.questions[1].text == "Define speed.\nGive its SI unit." and content.questions[1].pages == ["d1:0", "d1:1"]
    assert content.questions[1].context == "Motion" and content.questions[1].rubric == "distance/time (1)"
    assert [i.code for i in check_content(content)] == []  # 2 + 1 + 3 = 6 marks, all with rubrics


def test_rubric_only_documents_attach_to_the_exams_existing_questions():
    existing = [DraftQuestion(label="1", text="Solve", marks=2), DraftQuestion(label="2", text="Name", marks=1)]
    content, pieces = merge([page("rubric", rubric=[pr("2", "oxygen")])], existing=existing)
    attach_rubric(content, pieces, {0: "2"})
    assert content.mode == "rubric_only" and content.questions[1].rubric == "oxygen" and content.questions[0].rubric is None


def test_marks_missing_from_the_paper_come_from_the_rubric():
    content, pieces = merge([page("question_paper_and_rubric", questions=[pq("1", "Solve")], rubric=[pr("1", "x = 5", 2)])])
    assert attach_rubric(content, pieces, {0: "1"}) == ["1"] and content.questions[0].marks == 2


def test_choice_groups_count_once_toward_the_total():
    pages = [page("question_paper", total=7, questions=[pq("1", "a", 2), pq("2", "b", 5), pq("3", "c", 5)],
                  groups=[PageChoiceGroup(labels=["2", "3"], pick=1, note="Attempt either 2 or 3")])]
    content, _ = merge(pages)
    assert [q.choice_group for q in content.questions] == [None, "g1", "g1"] and expected_total(content) == 7
    assert "total_mismatch" not in [i.code for i in check_content(content)]


def test_blocking_and_warning_checks():
    pages = [page("question_paper", total=10, questions=[pq("1", "a", 2), pq("1", "again", 2), pq("2", "b")],
                  groups=[PageChoiceGroup(labels=["2", "9"], pick=2, note="")])]
    content, pieces = merge(pages + [page("rubric", doc="d2", rubric=[pr("7", "who knows")])])
    attach_rubric(content, pieces, {0: None})

    assert codes(check_content(content)) == [
        ("blocking", "choice_pick", None),
        ("blocking", "choice_unknown_question", None),
        ("blocking", "duplicate_label", "1"),
        ("blocking", "missing_marks", "2"),
        ("warning", "no_rubric", "1"),
        ("warning", "no_rubric", "1"),
        ("warning", "no_rubric", "2"),
        ("warning", "unmatched_rubric", None),
    ]


def test_bilingual_paper_keeps_the_english_question_and_attaches_the_other_language():
    pages = [
        page("question_paper", questions=[pq("1", "समीकरण 2x + 5 = 15 हल कीजिए।", 2), pq("2", "चाल को परिभाषित कीजिए।", 1)]),
        page("question_paper", index=1, questions=[pq("1", "Solve 2x + 5 = 15."), pq("2", "Define speed.", 1)]),
        page("question_paper", index=2, questions=[pq("3", "Name a gas.", 1)]),
        page("question_paper", index=3, questions=[pq("3", "एक गैस का नाम बताइए।", 1)]),
    ]
    content, _ = merge(pages)

    assert [q.label for q in content.questions] == ["1", "2", "3"]
    q1, _, q3 = content.questions
    assert q1.text == "Solve 2x + 5 = 15." and q1.alternate_language_text.startswith("समीकरण") and q1.marks == 2
    assert q1.pages == ["d1:0", "d1:1"]
    assert q3.text == "Name a gas." and q3.alternate_language_text == "एक गैस का नाम बताइए।"
    issues = check_content(content)
    assert ("warning", "bilingual_duplicate", "1") in codes(issues)
    assert not [i for i in issues if i.severity == "blocking" and i.code != "missing_marks"]
    assert "duplicate_label" not in [i.code for i in issues]


def test_same_script_repeats_stay_duplicates():
    content, _ = merge([page("question_paper", questions=[pq("1", "Solve it.", 2), pq("1", "Solve again.", 2)])])
    assert [q.text for q in content.questions] == ["Solve it.", "Solve again."]
    assert all(q.alternate_language_text is None for q in content.questions)
    assert ("blocking", "duplicate_label", "1") in codes(check_content(content))


def test_page_warnings_compare_what_was_seen_with_the_declared_role():
    pages = [page("question_paper", kind="rubric"), page("rubric", kind="question_paper", index=1),
             page("blank_copy", kind="mixed", handwriting=True, index=2), page("question_paper", kind="answers", index=3)]
    content, _ = merge(pages)
    assert [i.code for i in check_pages(content)] == [
        "role_mismatch", "role_mismatch", "handwriting_on_blank_copy", "answers_page"]


# ===== documents, extraction, drafts, confirmation (fake models) =====

from uuid import UUID  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session, select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.db import engine  # noqa: E402
from app.exam_drafts import service as drafts  # noqa: E402
from app.main import app  # noqa: E402
from app.models.audit import LLMCall  # noqa: E402
from app.models.document import Document, DocumentPage  # noqa: E402
from app.models.exam import Exam, SubmissionAnswer, Submission  # noqa: E402
from app.models.exam_draft import ExamDraft  # noqa: E402
from app import crud  # noqa: E402
from tests import ingestion_fixtures as fx  # noqa: E402

API = settings.API_V1_STR


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", tmp_path)
    with TestClient(app) as c:
        yield c


@pytest.fixture
def queued_extractions(monkeypatch):
    from app.worker import extract_exam_task

    calls = []
    monkeypatch.setattr(extract_exam_task, "delay", lambda *args: calls.append(args))
    return calls


def login(client, email):
    response = client.post(f"{API}/auth/login", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def upload(client, headers, exam_id, role, *files):
    response = client.post(f"{API}/exams/{exam_id}/documents", data={"role": role},
                           files=[("files", f) for f in files], headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def extraction(kind="question_paper", questions=(), rubric=(), groups=(), total=None, handwriting=False):
    return {"page_kind": kind, "has_handwriting": handwriting, "instructions": None, "total_marks": total,
            "questions": [dict(label=l, printed_label=f"Q.{l}", context=c, text=t, marks=m, question_type="descriptive",
                               continued=cont) for l, t, m, c, cont in questions],
            "rubric_items": [dict(label=l, printed_label=p, text=t, marks=m, continued=False) for l, p, t, m in rubric],
            "choice_groups": [dict(labels=g, pick=1, note="Attempt either") for g in groups]}


PAPER_P1 = extraction(total=7, questions=[("1", "Solve 2x + 5 = 15.", 2, None, False),
                                          ("2(a)", "Define speed.", 1, "Motion", False)])
PAPER_P2 = extraction(questions=[("2(a)", "State its SI unit.", None, None, True),
                                 ("3", "Explain photosynthesis.", 4, None, False),
                                 ("4", "Explain respiration.", 4, None, False)], groups=[["3", "4"]])
RUBRIC = extraction(kind="rubric", rubric=[("1", "1", "x = 5 (2)", 2), ("2a", "Q2a", "distance / time; m/s (1)", 1),
                                           ("3", "3", "light, chlorophyll, CO2 + water (4)", 4),
                                           ("4", "4", "glucose + oxygen -> energy (4)", 4),
                                           ("9", "9", "an item for no question", 1)])


def scripted_pages(prompt):
    if "is a question paper. This is page 1" in prompt:
        return PAPER_P1
    if "is a question paper. This is page 2" in prompt:
        return PAPER_P2
    return RUBRIC


def link_by_content(prompt):
    # The model is only asked about labels that didn't match exactly ("2a" and "9")
    links = []
    for line in prompt.splitlines():
        if line[:2] in ("1.", "4.") and "[Q2a]" in line:
            links.append({"item": int(line.split(".")[0]), "label": "2(a)"})
        elif "[9]" in line:
            links.append({"item": int(line.split(".")[0]), "label": "none"})
    return {"links": links}


@pytest.fixture
def exam_documents(client, school, queued_extractions):
    """A 2-page typed question paper and a text marking scheme, uploaded to the school's exam."""
    headers = login(client, "teacher@school.test")
    exam_id = school["exam"].id
    paper = upload(client, headers, exam_id, "question_paper", ("paper.pdf", fx.typed_pdf([["Q1"], ["Q3 OR Q4"]]), "application/pdf"))
    rubric = upload(client, headers, exam_id, "rubric", ("scheme.txt", b"1. x = 5 (2)\n2a. m/s", "text/plain"))
    return {"headers": headers, "exam_id": exam_id, "ids": [paper[0]["id"], rubric[0]["id"]]}


def draft_of(client, docs) -> dict:
    response = client.post(f"{API}/exams/{docs['exam_id']}/drafts", json={"document_ids": docs["ids"]}, headers=docs["headers"])
    assert response.status_code == 202, response.text
    return response.json()


def get_draft(client, docs, draft_id):
    return client.get(f"{API}/exams/{docs['exam_id']}/drafts/{draft_id}", headers=docs["headers"]).json()


def test_exam_documents_are_uploaded_with_a_role(client, school, db):
    headers = login(client, "teacher@school.test")
    exam_id = school["exam"].id
    (document,) = upload(client, headers, exam_id, "blank_copy", ("sheet.pdf", fx.typed_pdf(), "application/pdf"))
    assert document["role"] == "blank_copy" and document["kind"] == "pdf" and document["status"] == "received"

    bad = client.post(f"{API}/exams/{exam_id}/documents", data={"role": "answers"},
                      files=[("files", ("a.pdf", fx.typed_pdf(), "application/pdf"))], headers=headers)
    assert bad.status_code == 400 and "role must be one of" in bad.json()["detail"]
    student = client.post(f"{API}/exams/{exam_id}/documents", data={"role": "rubric"},
                          files=[("files", ("a.pdf", fx.typed_pdf(), "application/pdf"))],
                          headers=login(client, "student@school.test"))
    assert student.status_code == 403
    listed = client.get(f"{API}/exams/{exam_id}/documents", headers=headers).json()
    assert [d["id"] for d in listed] == [document["id"]]


async def test_extraction_builds_a_checked_draft(fake_llm, client, exam_documents, queued_extractions, db):
    fake_llm.extract_page, fake_llm.link_rubric = scripted_pages, link_by_content
    pending = draft_of(client, exam_documents)
    assert pending["status"] == "pending" and queued_extractions == [(pending["id"],)]

    await drafts.extract_draft(UUID(pending["id"]))

    draft = get_draft(client, exam_documents, pending["id"])
    content = draft["content"]
    assert draft["status"] == "ready" and content["mode"] == "questions" and content["total_marks"] == 7
    assert [(q["label"], q["marks"]) for q in content["questions"]] == [("1", 2), ("2(a)", 1), ("3", 4), ("4", 4)]
    q2a = content["questions"][1]
    assert q2a["text"] == "Define speed.\nState its SI unit." and q2a["context"] == "Motion"
    assert q2a["rubric"] == "distance / time; m/s (1)"  # "2a" linked by the model
    assert content["choice_groups"] == [{"id": "g1", "labels": ["3", "4"], "pick": 1, "note": "Attempt either"}]
    assert [q["choice_group"] for q in content["questions"]] == [None, None, "g1", "g1"]
    # 2 + 1 + one of (4, 4) = 7: no total mismatch; the stray item is reported, nothing blocks
    assert [(i["severity"], i["code"]) for i in draft["issues"]] == [("warning", "unmatched_rubric")]
    calls = db.exec(select(LLMCall).where(LLMCall.exam_draft_id == UUID(pending["id"]))).all()
    assert sorted(c.purpose for c in calls) == ["extract_exam_page"] * 3 + ["link_rubric"]
    roles = db.exec(select(DocumentPage.page_role).where(DocumentPage.page_role != None)).all()  # noqa: E711
    assert sorted(roles) == ["question_paper", "question_paper", "rubric"]


async def test_confirming_creates_questions_and_parses_their_rubrics(fake_llm, client, exam_documents, school, rubric_parses):
    fake_llm.extract_page, fake_llm.link_rubric = scripted_pages, link_by_content
    pending = draft_of(client, exam_documents)
    await drafts.extract_draft(UUID(pending["id"]))

    response = client.post(f"{API}/exams/{exam_documents['exam_id']}/drafts/{pending['id']}/confirm",
                           headers=exam_documents["headers"])

    assert response.status_code == 200, response.text
    questions = response.json()
    assert [(q["label"], q["printed_label"], q["max_score"], q["choice_group"]) for q in questions] == [
        ("1", "Q.1", 2, None), ("2(a)", "Q.2(a)", 1, None), ("3", "Q.3", 4, "g1"), ("4", "Q.4", 4, "g1")]
    assert questions[1]["question_text"] == "Motion\n\nDefine speed.\nState its SI unit."
    assert questions[0]["rubric_criteria"] == "x = 5 (2)" and len(rubric_parses) == 4
    with Session(engine) as fresh:
        exam = fresh.get(Exam, school["exam"].id)
        assert exam.config["choice_groups"][0]["labels"] == ["3", "4"]
        assert fresh.get(ExamDraft, UUID(pending["id"])).status == "confirmed"
        # The exam's earlier, unlabelled questions are replaced (soft-deleted)
        assert len(crud.question.get_by_exam(fresh, exam_id=exam.id)) == 4


async def test_blocking_issues_are_fixed_by_a_teacher_edit(fake_llm, client, exam_documents):
    no_marks = extraction(questions=[("1", "Solve 2x + 5 = 15.", None, None, False)])
    fake_llm.extract_page = lambda p: no_marks if "question paper. This is page 1" in p else extraction()
    docs = {**exam_documents, "ids": exam_documents["ids"][:1]}
    pending = draft_of(client, docs)
    await drafts.extract_draft(UUID(pending["id"]))
    url = f"{API}/exams/{docs['exam_id']}/drafts"

    blocked = client.post(f"{url}/{pending['id']}/confirm", headers=docs["headers"])
    assert blocked.status_code == 409 and blocked.json()["detail"]["issues"][0]["code"] == "missing_marks"

    content = get_draft(client, docs, pending["id"])["content"]
    content["questions"][0]["marks"], content["questions"][0]["rubric"] = 2, "x = 5"
    edited = client.put(f"{url}/{pending['id']}", json={"content": content}, headers=docs["headers"])
    assert edited.status_code == 201 and edited.json()["source"] == "teacher" and edited.json()["version"] == 2
    assert edited.json()["issues"] == [] and get_draft(client, docs, pending["id"])["status"] == "superseded"
    assert client.post(f"{url}/{edited.json()['id']}/confirm", headers=docs["headers"]).status_code == 200


async def test_confirming_updates_labelled_questions_in_place(fake_llm, client, exam_documents, school, db):
    # The exam already has question "1", graded for one submission
    first = sorted(school["exam"].questions, key=lambda x: x.order_index)[0]
    first.label = "1"
    db.add(first)
    submission = Submission(exam_id=school["exam"].id, original_file_url="x")
    db.add(submission)
    db.commit()
    db.add(SubmissionAnswer(submission_id=submission.id, question_id=first.id, score=1))
    db.commit()
    fake_llm.extract_page, fake_llm.link_rubric = scripted_pages, link_by_content
    pending = draft_of(client, exam_documents)
    await drafts.extract_draft(UUID(pending["id"]))

    questions = client.post(f"{API}/exams/{exam_documents['exam_id']}/drafts/{pending['id']}/confirm",
                            headers=exam_documents["headers"]).json()

    assert questions[0]["id"] == str(first.id) and questions[0]["max_score"] == 2  # same row, updated


async def test_a_rubric_alone_adds_rubrics_to_the_existing_questions(fake_llm, client, school, queued_extractions):
    headers = login(client, "teacher@school.test")
    exam_id = school["exam"].id
    (rubric,) = upload(client, headers, exam_id, "rubric", ("scheme.txt", b"Q2: chlorophyll", "text/plain"))
    fake_llm.extract_page = lambda p: extraction(kind="rubric", rubric=[("Q2", "Q2", "light and chlorophyll", 6)])
    docs = {"headers": headers, "exam_id": exam_id, "ids": [rubric["id"]]}
    pending = draft_of(client, docs)
    await drafts.extract_draft(UUID(pending["id"]))

    draft = get_draft(client, docs, pending["id"])
    assert draft["content"]["mode"] == "rubric_only" and [q["label"] for q in draft["content"]["questions"]] == ["Q1", "Q2"]
    questions = client.post(f"{API}/exams/{exam_id}/drafts/{pending['id']}/confirm", headers=headers).json()
    assert [q["rubric_criteria"] for q in questions] == ["Subtract 5\nDivide by 2", "light and chlorophyll"]


async def test_failed_extraction_is_recorded_and_not_retried(fake_llm, client, exam_documents):
    fake_llm.extract_page = lambda p: "not json"
    pending = draft_of(client, exam_documents)

    await drafts.extract_draft(UUID(pending["id"]))
    calls_after_first = len(fake_llm.calls)
    await drafts.extract_draft(UUID(pending["id"]))  # redelivered task

    draft = get_draft(client, exam_documents, pending["id"])
    assert draft["status"] == "failed" and draft["error"].startswith("The documents couldn't be read by the model")
    assert "output invalid after repair" in draft["error"]
    assert len(fake_llm.calls) == calls_after_first


async def test_unreadable_document_fails_the_draft(fake_llm, client, exam_documents, db):
    document = db.get(Document, UUID(exam_documents["ids"][0]))
    import os
    os.remove(document.stored_path)
    pending = draft_of(client, exam_documents)

    await drafts.extract_draft(UUID(pending["id"]))

    draft = get_draft(client, exam_documents, pending["id"])
    assert draft["status"] == "failed" and "missing from storage" in draft["error"]


def test_drafts_are_staff_only_and_scoped_to_the_exam(client, exam_documents, school, db):
    from tests.conftest import add_member, make_exam, make_org, make_user

    url = f"{API}/exams/{exam_documents['exam_id']}/drafts"
    pending = client.post(url, json={"document_ids": exam_documents["ids"]}, headers=exam_documents["headers"]).json()
    other_org = make_org(db, "other")
    outsider = add_member(db, make_user(db, "t@other.test"), other_org, school["teacher_m"].role)
    other_exam = make_exam(db, other_org, outsider, [{"question_text": "x", "max_score": 1}])

    assert client.get(f"{url}/{pending['id']}", headers=login(client, "t@other.test")).status_code == 403
    assert client.get(f"{url}/{pending['id']}", headers=login(client, "student@school.test")).status_code == 403
    assert client.get(f"{API}/exams/{other_exam.id}/drafts/{pending['id']}",
                      headers=login(client, "t@other.test")).status_code == 404
    foreign = client.post(f"{API}/exams/{other_exam.id}/drafts", json={"document_ids": exam_documents["ids"]},
                          headers=login(client, "t@other.test"))
    assert foreign.status_code == 400 and "not found in this exam" in foreign.json()["detail"]


async def test_unexpected_error_fails_the_draft_instead_of_leaving_it_pending(
    fake_llm, client, exam_documents, monkeypatch
):
    async def boom(*args, **kwargs):
        raise RuntimeError("kaboom")

    monkeypatch.setattr(drafts, "extract_page", boom)
    pending = draft_of(client, exam_documents)

    await drafts.extract_draft(UUID(pending["id"]))

    draft = get_draft(client, exam_documents, pending["id"])
    assert draft["status"] == "failed" and "RuntimeError" in draft["error"] and "kaboom" in draft["error"]
