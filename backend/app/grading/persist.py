"""Save a grading run's results in one transaction (Proposal 002 §8.2): new transcription and grade
versions, the submission_answers projection, unassigned segments and the submission's totals."""

from typing import Optional
from uuid import UUID

from sqlmodel import Session, col, select

from app.core.constants import SubmissionStatus
from app.grading.choices import Policy, max_total, not_counted
from app.grading.question import QuestionOutcome
from app.grading.stitch import Stitched
from app.models.audit import GradingRun
from app.models.base import utcnow
from app.models.exam import Question, Submission, SubmissionAnswer
from app.models.grading import AnswerGrade, AnswerStatus, Source, Transcription
from app.models.rubric import RubricSpecRecord
from app.services.labels import ChoiceGroup


def current(db: Session, model, submission_id: UUID) -> dict[UUID, object]:
    rows = db.exec(select(model).where(model.submission_id == submission_id, model.is_current == True)).all()  # noqa: E712
    return {row.question_id: row for row in rows}


def _next_versions(db: Session, model, submission_id: UUID) -> dict[UUID, int]:
    rows = db.exec(select(model.question_id, model.version).where(model.submission_id == submission_id)).all()
    versions: dict[UUID, int] = {}
    for question_id, version in rows:
        versions[question_id] = max(versions.get(question_id, 0), version)
    return versions


def save_results(
    db: Session,
    *,
    submission: Submission,
    run: GradingRun,
    questions: list[tuple[str, Question]],
    outcomes: list[QuestionOutcome],
    specs: dict[UUID, Optional[RubricSpecRecord]],
    stitched: Optional[Stitched],
    skip: set[str],
    groups: list[ChoiceGroup],
    policy: Policy,
) -> None:
    by_label = {o.label: o for o in outcomes}
    in_run = {label for label, _ in questions if label in by_label or label in skip}
    old_transcripts = current(db, Transcription, submission.id)
    old_grades = current(db, AnswerGrade, submission.id)

    # Which choice alternatives count, decided before anything is written (rows are append-only)
    scores = {label: o.score or 0.0 for label, o in by_label.items()}
    for label, q in questions:
        if label not in in_run and q.id in old_grades and old_grades[q.id].status != AnswerStatus.NOT_ATTEMPTED:
            scores[label] = old_grades[q.id].score or 0.0  # type: ignore[union-attr]
    order = [label for label, _ in questions]
    if stitched is not None:
        first_page = {label: min(s["page"] for s in a.segments) for label, a in stitched.answers.items() if a.segments}
        order = sorted(order, key=lambda label: first_page.get(label, 10**6))
    dropped = not_counted(groups, scores, order, policy)

    # Retire the versions being replaced, then add the new ones
    for label, q in questions:
        if label not in in_run:
            continue
        grade = old_grades.get(q.id)
        if grade is not None:
            grade.is_current = False  # type: ignore[attr-defined]
            db.add(grade)
        transcript = old_transcripts.get(q.id)
        if transcript is not None and transcript.source != Source.TEACHER and stitched is not None:  # type: ignore[attr-defined]
            transcript.is_current = False  # type: ignore[attr-defined]
            db.add(transcript)
    db.flush()

    grade_versions = _next_versions(db, AnswerGrade, submission.id)
    transcript_versions = _next_versions(db, Transcription, submission.id)
    new_grades: dict[UUID, AnswerGrade] = {}
    for label, q in questions:
        if label not in in_run:
            continue
        answer = stitched.answers.get(label) if stitched is not None else None
        transcript = old_transcripts.get(q.id)
        if stitched is not None and answer is not None and (transcript is None or transcript.source != Source.TEACHER):  # type: ignore[attr-defined]
            transcript = Transcription(
                submission_id=submission.id, question_id=q.id, run_id=run.id, version=transcript_versions.get(q.id, 0) + 1,
                source=Source.AI, text=answer.text, segments=answer.segments, confidence=answer.confidence,
                flags=answer.flags,
            )
            db.add(transcript)
            db.flush()  # the grade below references it, and nothing else orders the two inserts
        elif stitched is not None and answer is None and transcript is not None and transcript.source != Source.TEACHER:  # type: ignore[attr-defined]
            transcript = None  # nothing was found this time; the old reading is retired
        spec = specs.get(q.id)
        if label in skip:
            outcome = QuestionOutcome(q.id, label, AnswerStatus.NOT_ATTEMPTED, q.max_score)
        else:
            outcome = by_label[label]
        flags = list(outcome.flags) + (["extra_alternative_not_counted"] if label in dropped else [])
        grade = AnswerGrade(
            submission_id=submission.id, question_id=q.id, run_id=run.id, version=grade_versions.get(q.id, 0) + 1,
            source=Source.AI, status=outcome.status, score=outcome.score, max_score=q.max_score,
            counted=outcome.status != AnswerStatus.NOT_ATTEMPTED and label not in dropped,
            criteria=outcome.criteria, rounds=outcome.rounds, flags=flags, escalation_reason=outcome.escalation_reason,
            feedback=outcome.feedback, rubric_spec_id=spec.id if spec is not None else None,
            transcription_id=transcript.id if transcript is not None else None,  # type: ignore[union-attr]
            grader_model=outcome.grader_model, evaluator_model=outcome.evaluator_model,
            fallback_used=outcome.fallback_used,
        )
        db.add(grade)
        new_grades[q.id] = grade
        project(db, submission.id, q.id, grade, transcript)  # type: ignore[arg-type]

    # Totals over every question's current grade (including ones this run didn't touch)
    grades = [new_grades.get(q.id) or old_grades.get(q.id) for _, q in questions]
    counted = [g for g in grades if g is not None and g.counted]  # type: ignore[union-attr]
    submission.total_score = round(sum((g.score or 0.0) for g in counted), 6)  # type: ignore[union-attr]
    submission.max_score = max_total({label: q.max_score for label, q in questions}, groups)
    submission.percentage = (submission.total_score / submission.max_score * 100) if submission.max_score else 0
    escalated = any(g is not None and g.status == AnswerStatus.ESCALATED for g in grades)  # type: ignore[union-attr]
    submission.status = SubmissionStatus.NEEDS_REVIEW if escalated else SubmissionStatus.GRADED
    submission.current_step = "Needs review" if escalated else "Grading complete"
    if stitched is not None:
        submission.unassigned_segments = stitched.unassigned
    submission.updated_at = utcnow()
    db.add(submission)
    db.commit()


def project(db: Session, submission_id: UUID, question_id: UUID, grade: AnswerGrade,
             transcript: Optional[Transcription]) -> None:
    """Keep submission_answers (what the UI reads) in step with the current grade."""
    row = db.exec(select(SubmissionAnswer).where(
        SubmissionAnswer.submission_id == submission_id, col(SubmissionAnswer.question_id) == question_id)).first()
    if row is None:
        row = SubmissionAnswer(submission_id=submission_id, question_id=question_id)
    row.student_answer_text = transcript.text if transcript is not None else None
    row.score, row.feedback = grade.score, grade.feedback
    row.reasoning = "\n".join(f"[{c['id']}] {c['score']:g}: {c['justification']}" for c in grade.criteria) or None
    row.status, row.escalation_reason = grade.status, grade.escalation_reason
    db.add(row)
