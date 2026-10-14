from datetime import datetime, timezone
from typing import Any, List, Optional, Union
from uuid import UUID, uuid4

import structlog
from fastapi import APIRouter, Depends, Form, HTTPException, File, UploadFile
from sqlmodel import Session, col, select

from app import crud
from app.api import deps
from app.core.config import settings
from app.core.constants import Role, SubmissionStatus
from app.models.user import User, Membership
from app.grading.persist import current
from app.models.exam import Exam, Submission
from app.models.grade_event import EventKind, GradeEvent
from app.ingestion.service import stored_pages
from app.models.grading import AnswerGrade
from app.models.rubric import RubricSpecRecord
from app.schemas.exam import (
    MyResults,
    StudentAnswerView,
    StudentCriterionMark,
    StudentResultSummary,
    StudentSubmissionView,
    SubmissionAnswerRead,
    SubmissionRead,
    SubmissionWithAnswers,
)
from app.services.labels import exam_labels
from app.services.students import student_names
from app.audit.runs import create_run
from app.api.uploads import validated
from app.ingestion.service import store_upload
from app.models.document import DocumentRole
from app.schemas.review import ActionReason
from app.worker import grade_submission_task
from app.workflow import actions

router = APIRouter()
logger = structlog.get_logger(__name__)

def _resolve_student(db: Session, *, student_id: Optional[UUID], org_id: UUID) -> Optional[UUID]:
    """student_id is a membership id; it must be a student in the exam's org."""
    if student_id is None:
        return None
    membership = db.get(Membership, student_id)
    if (
        not membership
        or membership.deleted_at is not None
        or membership.org_id != org_id
        or membership.role != Role.STUDENT
    ):
        raise HTTPException(status_code=400, detail="Student not found in this organization")
    return membership.id


@router.post("/exams/{exam_id}/submissions", response_model=SubmissionRead)
async def create_submission(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    student_id: Optional[UUID] = Form(None),  # Student's membership id
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Upload a student's answers for grading: one file (`file`), or several (`files`, in page order,
    e.g. one photo per page). Accepts PDF, Word/ODT/RTF/PowerPoint, images (JPEG, PNG, WebP, HEIC,
    TIFF, GIF, BMP) and plain text. Every file is checked before anything is stored.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    student_membership_id = _resolve_student(db, student_id=student_id, org_id=exam.org_id)

    if not crud.question.get_by_exam(db, exam_id=exam_id):
        raise HTTPException(status_code=400, detail="Add questions to the exam before uploading answer sheets")

    uploads = ([file] if file else []) + list(files or [])
    if not uploads:
        raise HTTPException(status_code=400, detail="Attach at least one answer file")
    if len(uploads) > settings.MAX_FILES_PER_SUBMISSION:
        raise HTTPException(status_code=400, detail=f"At most {settings.MAX_FILES_PER_SUBMISSION} files per submission")
    checked = [await validated(upload) for upload in uploads]

    # TODO: Move to object storage (MinIO/S3) instead of the local upload dir
    # The submission row goes in first: documents reference it (no ORM relationship orders the inserts)
    db_submission = crud.submission.create(
        db,
        obj_in={
            "id": uuid4(),
            "exam_id": exam_id,
            "original_file_url": "",  # set to the first document below, for older readers
            "status": SubmissionStatus.PENDING,
            "student_membership_id": student_membership_id,
        },
    )
    documents = [
        store_upload(
            db, data=data, filename=name, kind=kind, org_id=exam.org_id, exam_id=exam_id,
            role=DocumentRole.ANSWERS, submission_id=db_submission.id, position=position,
            membership_id=membership.id if membership else None,
        )
        for position, (name, data, kind) in enumerate(checked)
    ]
    db_submission.original_file_url = documents[0].stored_path
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    # Each grading attempt is an audited run; the task only carries the run id
    run = create_run(
        db, submission_id=db_submission.id, trigger="upload",
        created_by_membership_id=membership.id if membership else None,
    )
    grade_submission_task.delay(str(run.id))
    logger.info("submission_queued", submission_id=str(db_submission.id), run_id=str(run.id), exam_id=str(exam_id))

    return db_submission


@router.get("/exams/{exam_id}/submissions", response_model=List[SubmissionRead])
def list_submissions(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List an exam's submissions, newest first, with each student's name.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    submissions = crud.submission.get_by_exam(db, exam_id=exam_id, skip=skip, limit=limit)
    names = student_names(db, [s.student_membership_id for s in submissions])
    return [SubmissionRead.model_validate(s).model_copy(update={"student_name": names.get(s.student_membership_id)})
            for s in submissions]


def _published_at(db: Session, submission_ids: list[UUID]) -> dict[UUID, datetime]:
    """When each submission was published (its latest publish event)."""
    if not submission_ids:
        return {}
    events = db.exec(select(GradeEvent).where(
        col(GradeEvent.submission_id).in_(submission_ids), GradeEvent.kind == EventKind.PUBLISH)).all()
    return {e.submission_id: e.created_at for e in sorted(events, key=lambda e: e.created_at)}


@router.get("/submissions/mine", response_model=MyResults)
def my_results(
    *,
    db: Session = Depends(deps.get_session),
    org_id: Optional[UUID] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    The signed-in student's own results: published ones with their totals, newest first, and how many of
    their answer sheets aren't published yet. Staff (who have no student membership) get an empty list.
    """
    memberships = select(Membership.id).where(
        Membership.user_id == current_user.id, Membership.role == Role.STUDENT,
        col(Membership.deleted_at).is_(None))
    if org_id is not None:
        memberships = memberships.where(Membership.org_id == org_id)
    rows = db.exec(
        select(Submission, Exam).join(Exam, col(Exam.id) == Submission.exam_id)
        .where(col(Submission.student_membership_id).in_(memberships), col(Submission.deleted_at).is_(None),
               col(Exam.deleted_at).is_(None))
        .order_by(col(Submission.created_at).desc())
    ).all()
    published = [(s, e) for s, e in rows if s.status == SubmissionStatus.PUBLISHED]
    when = _published_at(db, [s.id for s, _ in published])
    results = [StudentResultSummary(
        submission_id=s.id, exam_id=e.id, exam_name=e.name, total_score=s.total_score, max_score=s.max_score,
        percentage=s.percentage, published_at=when.get(s.id),
    ) for s, e in published]
    results.sort(key=lambda r: r.published_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return MyResults(results=results, awaiting=len(rows) - len(published))


@router.get("/submissions/{submission_id}", response_model=Union[SubmissionWithAnswers, StudentSubmissionView])
def read_submission(
    *,
    db: Session = Depends(deps.get_session),
    submission_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a submission with its graded answers. Students see only their own, once published, and only
    the scores and feedback.
    """
    submission = crud.submission.get(db, id=submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    exam = crud.exam.get(db, id=submission.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Submission not found")

    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id)
    if membership is not None and membership.role == Role.STUDENT:
        if submission.student_membership_id != membership.id or submission.status != SubmissionStatus.PUBLISHED:
            raise HTTPException(status_code=404, detail="Submission not found")
        return _student_view(db, submission)

    answers = crud.submission_answer.get_by_submission(db, submission_id=submission_id)
    return SubmissionWithAnswers(
        **SubmissionRead.model_validate(submission).model_dump(),
        answers=[SubmissionAnswerRead.model_validate(a) for a in answers],
    )


def _criterion_marks(db: Session, grade: Any) -> list[StudentCriterionMark]:
    """The grade's per-criterion marks, named from the rubric spec it was graded against. Only name, score
    and points: evidence, justifications and evaluator rounds stay with staff."""
    record = db.get(RubricSpecRecord, grade.rubric_spec_id) if grade.rubric_spec_id else None
    spec = {c.get("id"): c for c in ((record.spec or {}).get("criteria") or [])} if record else {}
    marks = []
    for c in grade.criteria or []:
        if c.get("score") is None:
            continue
        info = spec.get(c.get("id"), {})
        marks.append(StudentCriterionMark(name=info.get("description") or str(c.get("id")),
                                          score=float(c["score"]), max_points=info.get("points")))
    return marks


def _student_view(db: Session, submission: Submission) -> StudentSubmissionView:
    questions = crud.question.get_by_exam(db, exam_id=submission.exam_id)
    grades = current(db, AnswerGrade, submission.id)
    answers = []
    for label, q in zip(exam_labels(questions), questions):
        grade = grades.get(q.id)
        if grade is not None:
            answers.append(StudentAnswerView(
                question_id=q.id, label=label, question_text=q.question_text, score=grade.score,  # type: ignore[attr-defined]
                max_score=q.max_score, counted=grade.counted, feedback=grade.feedback,  # type: ignore[attr-defined]
                criteria=_criterion_marks(db, grade),
            ))
    exam = crud.exam.get(db, id=submission.exam_id)
    pages = sum(1 for p in stored_pages(db, submission) if p.image_path)
    return StudentSubmissionView(
        id=submission.id, exam_id=submission.exam_id, exam_name=exam.name if exam else None, status=submission.status,
        total_score=submission.total_score, max_score=submission.max_score, percentage=submission.percentage,
        published_at=_published_at(db, [submission.id]).get(submission.id), pages=pages, answers=answers,
    )


@router.post("/submissions/{submission_id}/regrade", response_model=SubmissionRead)
def regrade_submission(
    *,
    db: Session = Depends(deps.get_session),
    submission_id: UUID,
    body: Optional[ActionReason] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Grade the submission again (e.g. after a failure or a rubric change). Teacher transcripts are
    kept; an approval is cleared; published results can't be regraded.
    """
    submission = crud.submission.get(db, id=submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    exam = crud.exam.get(db, id=submission.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Submission not found")
    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)

    run = actions.request_regrade(db, submission, reason=body.reason if body else None,
                                  actor=membership.id if membership else None)
    grade_submission_task.delay(str(run.id))
    db.refresh(submission)
    return submission
