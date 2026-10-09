from typing import Any, List, Optional, Union
from uuid import UUID, uuid4

import structlog
from fastapi import APIRouter, Depends, Form, HTTPException, File, UploadFile
from sqlmodel import Session

from app import crud
from app.api import deps
from app.core.config import settings
from app.core.constants import Role, SubmissionStatus
from app.models.user import User, Membership
from app.grading.persist import current
from app.models.exam import Submission
from app.models.grading import AnswerGrade
from app.schemas.exam import (
    StudentAnswerView,
    StudentSubmissionView,
    SubmissionAnswerRead,
    SubmissionRead,
    SubmissionWithAnswers,
)
from app.services.labels import exam_labels
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
    List an exam's submissions, newest first.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    return crud.submission.get_by_exam(db, exam_id=exam_id, skip=skip, limit=limit)


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
            ))
    return StudentSubmissionView(
        id=submission.id, exam_id=submission.exam_id, status=submission.status, total_score=submission.total_score,
        max_score=submission.max_score, percentage=submission.percentage, answers=answers,
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
