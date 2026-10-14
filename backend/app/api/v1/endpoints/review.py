"""Review workflow endpoints (Proposal 002 §9): what teachers review (queue, answers, page images,
audit timeline) and their actions on grades, approval and publishing."""

import mimetypes
from pathlib import Path
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlmodel import Session, col, select

from app import crud
from app.api import deps
from app.core.config import settings
from app.core.constants import Role, SubmissionStatus
from app.grading import persist
from app.ingestion.service import stored_pages
from app.models.audit import GradingRun, LLMCall
from app.models.exam import Exam, Question, Submission
from app.models.grade_event import GradeEvent
from app.models.grading import AnswerGrade, AnswerStatus, Source, Transcription
from app.models.rubric import RubricSpecRecord, RubricStatus
from app.models.user import Membership, User
from app.rubrics.service import current_spec, current_specs
from app.schemas.exam import SubmissionRead
from app.schemas.review import (
    ActionReason,
    AnswerGradeRead,
    GradeActionResult,
    OverrideRequest,
    PageRead,
    PublishResult,
    QuestionReview,
    ResolveRequest,
    ReviewQueueItem,
    SubmissionReview,
    TimelineEntry,
    TranscriptEdit,
    TranscriptionRead,
)
from app.services.labels import exam_labels
from app.services.students import student_names
from app.worker import grade_submission_task
from app.workflow import actions

router = APIRouter()


def staff_submission(db: Session, submission_id: UUID, user: User) -> tuple[Submission, Exam, Optional[Membership]]:
    submission = crud.submission.get(db, id=submission_id)
    exam = crud.exam.get(db, id=submission.exam_id) if submission else None
    if not submission or not exam:
        raise HTTPException(status_code=404, detail="Submission not found")
    membership = deps.require_org_role(db, user=user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    return submission, exam, membership


def exam_question(db: Session, exam: Exam, question_id: UUID) -> Question:
    question = crud.question.get(db, id=question_id)
    if not question or question.exam_id != exam.id:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


def exam_labels_by_id(db: Session, exam: Exam) -> tuple[list[Question], dict[UUID, str]]:
    questions = crud.question.get_by_exam(db, exam_id=exam.id)
    return questions, {q.id: label for label, q in zip(exam_labels(questions), questions)}


def _actor(membership: Optional[Membership]) -> Optional[UUID]:
    return membership.id if membership else None


def _result(db: Session, grade: Any, submission: Submission) -> GradeActionResult:
    db.refresh(submission)
    return GradeActionResult(grade=AnswerGradeRead.model_validate(grade), submission=SubmissionRead.model_validate(submission))


@router.post("/submissions/{submission_id}/answers/{question_id}/override", response_model=GradeActionResult)
def override_grade(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, question_id: UUID, body: OverrideRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Set an answer's criterion scores (mandatory reason). Creates a new grade version; the old one is kept."""
    submission, exam, membership = staff_submission(db, submission_id, current_user)
    question = exam_question(db, exam, question_id)
    grade = actions.override(
        db, submission, question, expected_grade_id=body.expected_grade_id,
        criteria=[c.model_dump() for c in body.criteria], reason=body.reason, feedback=body.feedback,
        actor=_actor(membership),
    )
    return _result(db, grade, submission)


@router.post("/submissions/{submission_id}/answers/{question_id}/resolve", response_model=GradeActionResult)
def resolve_grade(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, question_id: UUID, body: ResolveRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Accept an escalated answer's proposed grade."""
    submission, exam, membership = staff_submission(db, submission_id, current_user)
    question = exam_question(db, exam, question_id)
    grade = actions.resolve(db, submission, question, expected_grade_id=body.expected_grade_id,
                            reason=body.reason, actor=_actor(membership))
    return _result(db, grade, submission)


@router.patch("/submissions/{submission_id}/answers/{question_id}/transcript", response_model=SubmissionRead)
def edit_transcript(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, question_id: UUID, body: TranscriptEdit,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Correct the transcript of one answer (mandatory reason); that question is regraded from it."""
    submission, exam, membership = staff_submission(db, submission_id, current_user)
    question = exam_question(db, exam, question_id)
    run = actions.edit_transcript(db, submission, question, text=body.text, reason=body.reason,
                                  actor=_actor(membership))
    grade_submission_task.delay(str(run.id))
    db.refresh(submission)
    return submission


@router.post("/submissions/{submission_id}/approve", response_model=SubmissionRead)
def approve_submission(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, body: Optional[ActionReason] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Approve the grades (refused while any answer still needs review)."""
    submission, _, membership = staff_submission(db, submission_id, current_user)
    return actions.approve(db, submission, reason=body.reason if body else None, actor=_actor(membership))


@router.post("/submissions/{submission_id}/unapprove", response_model=SubmissionRead)
def unapprove_submission(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, body: Optional[ActionReason] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    submission, _, membership = staff_submission(db, submission_id, current_user)
    return actions.unapprove(db, submission, reason=body.reason if body else None, actor=_actor(membership))


@router.post("/exams/{exam_id}/publish", response_model=PublishResult)
def publish_exam(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Publish the exam's approved submissions to their students. Others are left as they are."""
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    published, not_approved = actions.publish(db, exam, actor=_actor(membership))
    return PublishResult(published=published, not_approved=not_approved)


# ===== what teachers review =====

def _ready_spec_ids(db: Session, questions: list[Question]) -> dict[UUID, UUID]:
    """Each question's current spec id, for questions whose current spec is ready."""
    return {qid: spec.id for qid, spec in current_specs(db, questions).items() if spec.status == RubricStatus.READY}


def _rubric_outdated(grade: Optional[AnswerGrade], ready: dict[UUID, UUID]) -> bool:
    """The grade used a rubric spec that is no longer the question's current ready one."""
    return bool(grade and grade.rubric_spec_id and ready.get(grade.question_id) != grade.rubric_spec_id)


@router.get("/exams/{exam_id}/review-queue", response_model=list[ReviewQueueItem])
def review_queue(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, escalated_only: bool = False,
    limit: int = Query(default=200, ge=1, le=1000), current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Answers to review across the exam's graded submissions: escalated ones first, then the model's
    grades with the lowest evaluator agreement. Teacher decisions and unattempted alternatives aren't listed."""
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    submissions = {s.id: s for s in db.exec(select(Submission).where(
        Submission.exam_id == exam.id, col(Submission.deleted_at).is_(None),
        col(Submission.status).in_([SubmissionStatus.NEEDS_REVIEW, SubmissionStatus.GRADED]),
    )).all()}
    if not submissions:
        return []
    questions, labels = exam_labels_by_id(db, exam)
    order = {q.id: q.order_index for q in questions}
    names = student_names(db, [s.student_membership_id for s in submissions.values()])
    ready = _ready_spec_ids(db, questions)
    grades = db.exec(select(AnswerGrade).where(
        col(AnswerGrade.submission_id).in_(list(submissions)), AnswerGrade.is_current == True,  # noqa: E712
        AnswerGrade.source == Source.AI, AnswerGrade.status != AnswerStatus.NOT_ATTEMPTED,
    )).all()

    ranked = []
    for grade in grades:
        escalated = grade.status == AnswerStatus.ESCALATED
        if grade.question_id not in labels or (escalated_only and not escalated):
            continue
        submission = submissions[grade.submission_id]
        agreement = grade.rounds[-1].get("effective_agreement") if grade.rounds else None
        key = (not escalated, 1.0 if agreement is None else agreement, submission.created_at, order[grade.question_id])
        ranked.append((key, ReviewQueueItem(
            submission_id=submission.id, submission_status=submission.status.value,
            student_membership_id=submission.student_membership_id,
            student_name=names.get(submission.student_membership_id) if submission.student_membership_id else None,
            question_id=grade.question_id, question_label=labels[grade.question_id], grade_id=grade.id,
            status=grade.status, escalation_reason=grade.escalation_reason, score=grade.score,
            max_score=grade.max_score, agreement=agreement, rubric_outdated=_rubric_outdated(grade, ready),
        )))
    ranked.sort(key=lambda item: item[0])
    return [item for _, item in ranked[:limit]]


def _spec_view(spec: Optional[RubricSpecRecord]) -> Optional[dict[str, Any]]:
    if spec is None:
        return None
    return {"id": str(spec.id), "version": spec.version, "status": spec.status,
            "validation_errors": spec.validation_errors, "spec": spec.spec}


@router.get("/submissions/{submission_id}/review", response_model=SubmissionReview)
def review_submission(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Everything the review screen shows: pages, and per question the rubric spec, the current
    transcript and grade (criteria with evidence, every evaluator round) and the earlier grade versions."""
    submission, exam, _ = staff_submission(db, submission_id, current_user)
    questions, labels = exam_labels_by_id(db, exam)
    transcripts = persist.current(db, Transcription, submission.id)
    history: dict[UUID, list[AnswerGrade]] = {}
    for grade in db.exec(select(AnswerGrade).where(AnswerGrade.submission_id == submission.id)
                         .order_by(col(AnswerGrade.version).desc())).all():
        history.setdefault(grade.question_id, []).append(grade)
    ready = _ready_spec_ids(db, questions)

    reviews = []
    for q in questions:
        grades = history.get(q.id, [])
        grade = next((g for g in grades if g.is_current), None)
        spec = db.get(RubricSpecRecord, grade.rubric_spec_id) if grade and grade.rubric_spec_id else current_spec(db, q)
        transcript = transcripts.get(q.id)
        reviews.append(QuestionReview(
            question_id=q.id, label=labels[q.id], printed_label=q.printed_label, text=q.question_text,
            max_score=q.max_score, choice_group=q.choice_group, rubric_spec=_spec_view(spec),
            rubric_outdated=_rubric_outdated(grade, ready),
            transcription=TranscriptionRead.model_validate(transcript) if transcript else None,
            grade=AnswerGradeRead.model_validate(grade) if grade else None,
            previous_grades=[AnswerGradeRead.model_validate(g) for g in grades if not g.is_current],
        ))
    pages = [PageRead(number=i, document_id=p.document_id, page_index=p.page_index, kind=p.kind, width=p.width,
                      height=p.height, has_image=p.image_path is not None)
             for i, p in enumerate(stored_pages(db, submission), start=1)]
    names = student_names(db, [submission.student_membership_id])
    return SubmissionReview(
        submission=SubmissionRead.model_validate(submission),
        student_name=names.get(submission.student_membership_id) if submission.student_membership_id else None,
        pages=pages, unassigned_segments=submission.unassigned_segments or [], questions=reviews,
    )


@router.get("/submissions/{submission_id}/pages/{number}/image")
def page_image(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, number: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """One page of the answer sheet as the model saw it, for staff, and for the student whose sheet it is once
    the results are published. Not cached by browsers."""
    submission = crud.submission.get(db, id=submission_id)
    exam = crud.exam.get(db, id=submission.exam_id) if submission else None
    if not submission or not exam:
        raise HTTPException(status_code=404, detail="Submission not found")
    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id)
    if membership is not None and membership.role == Role.STUDENT and (
            submission.student_membership_id != membership.id or submission.status != SubmissionStatus.PUBLISHED):
        raise HTTPException(status_code=404, detail="Page not found")
    pages = stored_pages(db, submission)
    page = pages[number - 1] if 1 <= number <= len(pages) else None
    path = Path(page.image_path).resolve() if page is not None and page.image_path else None
    if path is None or not path.is_relative_to(settings.UPLOAD_DIR.resolve()) or not path.is_file():
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(path, media_type=mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                        headers={"Cache-Control": "private, no-store"})


@router.get("/submissions/{submission_id}/timeline", response_model=list[TimelineEntry])
def submission_timeline(
    *, db: Session = Depends(deps.get_session), submission_id: UUID, bodies: bool = False,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Everything that happened to the submission, oldest first: grading runs, every model call,
    transcript and grade versions, and teacher actions. `bodies=true` adds each model call's raw
    request and response (owners and admins only)."""
    submission, exam, membership = staff_submission(db, submission_id, current_user)
    if bodies and membership is not None and membership.role not in deps.ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only owners and admins can see raw model requests and responses")
    _, labels = exam_labels_by_id(db, exam)

    def of(model):
        return db.exec(select(model).where(model.submission_id == submission.id)).all()

    entries = [TimelineEntry(at=run.created_at, type="run", question_label=None,
                             actor_membership_id=run.created_by_membership_id, data={
        "run_id": str(run.id), "trigger": run.trigger, "status": run.status, "error": run.error,
        "question_ids": run.question_ids, "started_at": run.started_at, "finished_at": run.finished_at,
        "llm_calls": run.llm_calls, "cost_usd": run.cost_usd, "config_hash": run.config_hash,
        "code_version": run.code_version, "trace_id": run.trace_id,
    }) for run in of(GradingRun)]
    for call in of(LLMCall):
        data = {key: getattr(call, key) for key in (
            "role", "purpose", "round", "attempt_no", "attempt_kind", "provider", "model_requested", "model_answered",
            "external", "stop_reason", "error_type", "error_message", "fallback_reason", "degraded", "input_tokens",
            "output_tokens", "cost_usd", "latency_ms")}
        data.update(id=str(call.id), run_id=str(call.run_id) if call.run_id else None)
        if bodies:
            data.update(request=call.request, response=call.response_raw, parsed=call.parsed)
        entries.append(TimelineEntry(at=call.created_at, type="llm_call", question_label=call.question_label,
                                     actor_membership_id=None, data=data))
    for t in of(Transcription):
        entries.append(TimelineEntry(at=t.created_at, type="transcription", question_label=labels.get(t.question_id),
                                     actor_membership_id=t.created_by_membership_id, data={
            "id": str(t.id), "version": t.version, "source": t.source, "text": t.text, "confidence": t.confidence,
            "flags": t.flags, "is_current": t.is_current, "run_id": str(t.run_id) if t.run_id else None,
        }))
    for g in of(AnswerGrade):
        entries.append(TimelineEntry(at=g.created_at, type="grade", question_label=labels.get(g.question_id),
                                     actor_membership_id=g.created_by_membership_id, data={
            "id": str(g.id), "version": g.version, "source": g.source, "status": g.status, "score": g.score,
            "max_score": g.max_score, "counted": g.counted, "escalation_reason": g.escalation_reason,
            "override_reason": g.override_reason, "rounds": len(g.rounds), "grader_model": g.grader_model,
            "evaluator_model": g.evaluator_model, "fallback_used": g.fallback_used, "is_current": g.is_current,
            "run_id": str(g.run_id) if g.run_id else None,
        }))
    for e in of(GradeEvent):
        entries.append(TimelineEntry(at=e.created_at, type="event", question_label=labels.get(e.question_id) if e.question_id else None,
                                     actor_membership_id=e.actor_membership_id, data={
            "kind": e.kind, "reason": e.reason, "before": e.before, "after": e.after,
            "run_id": str(e.run_id) if e.run_id else None,
        }))
    return sorted(entries, key=lambda entry: entry.at)
