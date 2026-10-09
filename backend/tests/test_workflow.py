"""The submission state machine (Proposal 002 §9) and the events teacher actions leave behind."""

import pytest
from sqlmodel import select

from app.core.constants import SubmissionStatus as S
from app.models.exam import Submission
from app.models.grade_event import EventKind, GradeEvent
from app.workflow.state import ALLOWED, WorkflowError, can_move, transition

EDGES = {
    (S.PENDING, S.PROCESSING),
    (S.PROCESSING, S.GRADED), (S.PROCESSING, S.NEEDS_REVIEW), (S.PROCESSING, S.FAILED),
    (S.NEEDS_REVIEW, S.GRADED), (S.NEEDS_REVIEW, S.PENDING),
    (S.GRADED, S.APPROVED), (S.GRADED, S.PENDING),
    (S.APPROVED, S.GRADED), (S.APPROVED, S.PUBLISHED), (S.APPROVED, S.PENDING),
    (S.FAILED, S.PENDING),
}


@pytest.mark.parametrize("current", list(S))
@pytest.mark.parametrize("target", list(S))
def test_only_the_documented_edges_are_allowed(current, target):
    assert can_move(current, target) == ((current, target) in EDGES)


def test_every_status_has_a_row():
    assert set(ALLOWED) == set(S)


def test_published_results_are_final():
    assert not any(can_move(S.PUBLISHED, target) for target in S)


def submission(db, school, status):
    row = Submission(exam_id=school["exam"].id, original_file_url="x", status=status)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_a_transition_records_who_did_what_and_why(db, school):
    row = submission(db, school, S.GRADED)
    transition(db, row, S.APPROVED, kind=EventKind.APPROVE, actor_membership_id=school["teacher_m"].id,
               reason="checked", after={"total": 4})
    db.commit()

    event = db.exec(select(GradeEvent)).one()
    assert db.get(Submission, row.id).status == S.APPROVED
    assert (event.kind, event.actor_membership_id, event.reason) == (EventKind.APPROVE, school["teacher_m"].id, "checked")
    assert event.before == {"status": "GRADED"} and event.after == {"status": "APPROVED", "total": 4}


def test_an_invalid_transition_changes_nothing(db, school):
    row = submission(db, school, S.NEEDS_REVIEW)
    with pytest.raises(WorkflowError, match="NEEDS_REVIEW submission can't become APPROVED"):
        transition(db, row, S.APPROVED, kind=EventKind.APPROVE, actor_membership_id=None)
    db.commit()
    assert db.get(Submission, row.id).status == S.NEEDS_REVIEW
    assert db.exec(select(GradeEvent)).all() == []
