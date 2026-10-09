"""Teacher actions on a submission (Proposal 002 §9). Each checks the submission's state, writes new
versions where a grade or transcript changes (old ones are kept), records a grade event and commits
once. Actions that start a grading run return it; the caller enqueues it after the commit."""

from typing import Any, Optional
from uuid import UUID

from sqlmodel import Session, col, select

from app import crud
from app.audit.runs import new_run
from app.core.constants import SubmissionStatus as S
from app.grading import persist
from app.grading.checks import EPSILON, check_scores, total
from app.models.audit import GradingRun
from app.models.exam import Exam, Question, Submission
from app.models.grade_event import EventKind
from app.models.grading import AnswerGrade, AnswerStatus, Source, Transcription
from app.models.rubric import RubricSpecRecord, RubricStatus
from app.rubrics.schema import RubricSpec
from app.rubrics.service import current_spec
from app.workflow.state import WorkflowError, record, transition

REVIEWABLE = (S.GRADED, S.NEEDS_REVIEW)


class InvalidScores(ValueError):
    """A teacher's scores fail the same checks a model's must pass (HTTP 422)."""

    def __init__(self, errors: list[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


def lock(db: Session, submission: Submission) -> Submission:
    """Re-read the submission locked for this transaction (Postgres), so actions on it run one at a time."""
    return db.exec(
        select(Submission).where(Submission.id == submission.id).with_for_update()
        .execution_options(populate_existing=True)
    ).one()


def _require(submission: Submission, allowed: tuple[S, ...], action: str) -> None:
    if submission.status not in allowed:
        raise WorkflowError(f"Can't {action}: the submission is {submission.status.value}.")


def _live_grades(db: Session, submission: Submission) -> list[AnswerGrade]:
    live = {q.id for q in crud.question.get_by_exam(db, exam_id=submission.exam_id)}
    return [g for q, g in persist.current(db, AnswerGrade, submission.id).items() if q in live]  # type: ignore[misc]


def _expected_grade(db: Session, submission: Submission, question: Question, expected_grade_id: UUID) -> AnswerGrade:
    grade = persist.current(db, AnswerGrade, submission.id).get(question.id)
    if grade is None:
        raise WorkflowError("This answer hasn't been graded yet.")
    if grade.id != expected_grade_id:  # type: ignore[attr-defined]
        raise WorkflowError("This answer's grade changed since you loaded it; reload and try again.")
    return grade  # type: ignore[return-value]


def _new_grade(db: Session, old: AnswerGrade, actor: Optional[UUID], **fields: Any) -> AnswerGrade:
    """The teacher's version of a grade: replaces `old` as the current one."""
    old.is_current = False
    db.add(old)
    db.flush()  # one current version per answer (unique index)
    grade = AnswerGrade(
        submission_id=old.submission_id, question_id=old.question_id, version=old.version + 1,
        source=Source.TEACHER, status=AnswerStatus.GRADED, max_score=old.max_score, counted=old.counted,
        flags=old.flags, transcription_id=old.transcription_id, created_by_membership_id=actor, **fields,
    )
    db.add(grade)
    db.flush()
    transcript = db.get(Transcription, old.transcription_id) if old.transcription_id else None
    persist.project(db, old.submission_id, old.question_id, grade, transcript)
    return grade


def _after_review(db: Session, submission: Submission, actor: Optional[UUID]) -> None:
    """New totals; the submission is GRADED once no answer needs review."""
    grades = _live_grades(db, submission)
    submission.total_score = round(sum((g.score or 0.0) for g in grades if g.counted), 6)
    submission.percentage = (submission.total_score / submission.max_score * 100) if submission.max_score else 0
    db.add(submission)
    if submission.status == S.NEEDS_REVIEW and not any(g.status == AnswerStatus.ESCALATED for g in grades):
        transition(db, submission, S.GRADED, kind=EventKind.REVIEW_COMPLETE, actor_membership_id=actor)
        submission.current_step = "Review complete"


def _summary(grade: AnswerGrade) -> dict[str, Any]:
    return {"grade_id": str(grade.id), "status": grade.status, "score": grade.score,
            "escalation_reason": grade.escalation_reason, "criteria": {c["id"]: c["score"] for c in grade.criteria}}


def _spec_for(db: Session, grade: AnswerGrade, question: Question) -> RubricSpecRecord:
    """The spec the grade was made against; for an answer that was never graded (rubric invalid at the
    time), the question's current spec if it's ready now."""
    spec = db.get(RubricSpecRecord, grade.rubric_spec_id) if grade.rubric_spec_id else current_spec(db, question)
    if spec is None or spec.status != RubricStatus.READY:
        raise WorkflowError("This question's rubric isn't ready: fix the rubric, then score the answer.")
    return spec


def override(
    db: Session, submission: Submission, question: Question, *, expected_grade_id: UUID,
    criteria: list[dict[str, Any]], reason: str, feedback: Optional[str], actor: Optional[UUID],
) -> AnswerGrade:
    """The teacher sets every criterion's score (same checks as the model's, except quoted evidence)."""
    submission = lock(db, submission)
    _require(submission, REVIEWABLE, "change scores")
    old = _expected_grade(db, submission, question, expected_grade_id)
    if old.status == AnswerStatus.NOT_ATTEMPTED:
        raise WorkflowError("This alternative wasn't attempted: correct its transcript to have it graded.")
    spec_record = _spec_for(db, old, question)
    spec = RubricSpec.model_validate(spec_record.spec)
    errors = check_scores(criteria, spec)
    if errors:
        raise InvalidScores(errors)

    given, before = {c["id"]: c for c in criteria}, {c["id"]: c for c in old.criteria}
    merged = []
    for criterion in spec.criteria:
        new, prior = given[criterion.id], before.get(criterion.id, {})
        unchanged = "score" in prior and abs(prior["score"] - new["score"]) < EPSILON
        merged.append({
            "id": criterion.id, "score": new["score"], "evidence": prior.get("evidence", ""),
            "justification": new.get("justification") or (prior.get("justification", "") if unchanged
                                                           else f"Set by the teacher: {reason}"),
        })
    grade = _new_grade(db, old, actor, score=total(merged), criteria=merged, rubric_spec_id=spec_record.id,
                       feedback=feedback if feedback is not None else old.feedback, override_reason=reason)
    record(db, submission, EventKind.OVERRIDE, actor_membership_id=actor, reason=reason, question_id=question.id,
           before=_summary(old), after=_summary(grade))
    _after_review(db, submission, actor)
    db.commit()
    db.refresh(grade)
    return grade


def resolve(
    db: Session, submission: Submission, question: Question, *, expected_grade_id: UUID,
    reason: Optional[str], actor: Optional[UUID],
) -> AnswerGrade:
    """The teacher accepts an escalated answer's proposed grade as it is."""
    submission = lock(db, submission)
    _require(submission, REVIEWABLE, "resolve answers")
    old = _expected_grade(db, submission, question, expected_grade_id)
    if old.status != AnswerStatus.ESCALATED:
        raise WorkflowError("This answer isn't waiting for review.")
    if old.score is None:
        raise WorkflowError("There's no proposed score to accept: set the scores instead.")
    grade = _new_grade(db, old, actor, score=old.score, criteria=old.criteria, rubric_spec_id=old.rubric_spec_id,
                       feedback=old.feedback, override_reason=reason)
    record(db, submission, EventKind.RESOLVE, actor_membership_id=actor, reason=reason, question_id=question.id,
           before=_summary(old), after=_summary(grade))
    _after_review(db, submission, actor)
    db.commit()
    db.refresh(grade)
    return grade


def edit_transcript(
    db: Session, submission: Submission, question: Question, *, text: str, reason: str, actor: Optional[UUID],
) -> GradingRun:
    """The teacher corrects what was read for one question; that question is regraded from it (an
    approved submission loses its approval). The teacher's transcript is kept by later regrades."""
    submission = lock(db, submission)
    _require(submission, (S.GRADED, S.NEEDS_REVIEW, S.APPROVED), "correct transcripts")
    run = new_run(db, submission_id=submission.id, trigger="transcript_edit", created_by_membership_id=actor,
                  question_ids=[question.id])
    old = persist.current(db, Transcription, submission.id).get(question.id)
    versions = [t.version for t in db.exec(select(Transcription).where(
        Transcription.submission_id == submission.id, col(Transcription.question_id) == question.id)).all()]
    if old is not None:
        old.is_current = False  # type: ignore[attr-defined]
        db.add(old)
        db.flush()
    transcript = Transcription(
        submission_id=submission.id, question_id=question.id, version=max(versions, default=0) + 1,
        source=Source.TEACHER, text=text, created_by_membership_id=actor,
    )
    db.add(transcript)
    db.flush()
    transition(db, submission, S.PENDING, kind=EventKind.TRANSCRIPT_EDIT, actor_membership_id=actor, reason=reason,
               question_id=question.id, run_id=run.id,
               before={"transcription_id": str(old.id) if old else None, "text": old.text if old else None},  # type: ignore[attr-defined]
               after={"transcription_id": str(transcript.id), "text": text})
    submission.current_step = "Queued for regrading"
    db.commit()
    return run


def request_regrade(db: Session, submission: Submission, *, reason: Optional[str], actor: Optional[UUID]) -> GradingRun:
    """Grade the whole submission again (teacher transcripts are kept; an approval is cleared)."""
    submission = lock(db, submission)
    if submission.status in (S.PENDING, S.PROCESSING):
        raise WorkflowError("This submission is already being graded.")
    run = new_run(db, submission_id=submission.id, trigger="regrade", created_by_membership_id=actor)
    transition(db, submission, S.PENDING, kind=EventKind.REGRADE_REQUESTED, actor_membership_id=actor,
               reason=reason, run_id=run.id)
    submission.current_step = "Queued for regrading"
    db.commit()
    return run


def approve(db: Session, submission: Submission, *, reason: Optional[str], actor: Optional[UUID]) -> Submission:
    submission = lock(db, submission)
    if submission.status == S.NEEDS_REVIEW:
        waiting = sum(g.status == AnswerStatus.ESCALATED for g in _live_grades(db, submission))
        raise WorkflowError(f"{waiting} answer(s) still need review.")
    transition(db, submission, S.APPROVED, kind=EventKind.APPROVE, actor_membership_id=actor, reason=reason,
               after={"total_score": submission.total_score, "max_score": submission.max_score})
    submission.current_step = "Approved"
    db.commit()
    db.refresh(submission)
    return submission


def unapprove(db: Session, submission: Submission, *, reason: Optional[str], actor: Optional[UUID]) -> Submission:
    submission = lock(db, submission)
    transition(db, submission, S.GRADED, kind=EventKind.UNAPPROVE, actor_membership_id=actor, reason=reason)
    submission.current_step = "Grading complete"
    db.commit()
    db.refresh(submission)
    return submission


def publish(db: Session, exam: Exam, *, actor: Optional[UUID]) -> tuple[int, int]:
    """Publish every approved submission of the exam. Returns (published, not yet approved)."""
    rows = db.exec(select(Submission).where(
        Submission.exam_id == exam.id, col(Submission.deleted_at).is_(None),
    ).with_for_update().execution_options(populate_existing=True)).all()
    published = 0
    for submission in rows:
        if submission.status == S.APPROVED:
            transition(db, submission, S.PUBLISHED, kind=EventKind.PUBLISH, actor_membership_id=actor,
                       after={"total_score": submission.total_score, "max_score": submission.max_score})
            submission.current_step = "Published"
            published += 1
    not_approved = sum(s.status not in (S.APPROVED, S.PUBLISHED) for s in rows)
    db.commit()
    return published, not_approved
