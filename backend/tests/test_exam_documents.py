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

    ocr_schema = fake_llm.calls_of("ocr")[0]["request"].json_schema
    assert ocr_schema["properties"]["answers"]["items"]["properties"]["question_id"]["enum"] == ["1", "2(a)"]
    assert {c["request"].trace_metadata.get("question") for c in fake_llm.calls_of("grade")} == {"1", "2(a)"}
