from pathlib import Path
from typing import Any, List, Optional
from uuid import UUID, uuid4

import structlog
from fastapi import APIRouter, Depends, Form, HTTPException, File, UploadFile
from sqlmodel import Session

from app import crud
from app.api import deps
from app.core.config import settings
from app.core.constants import Role, SubmissionStatus
from app.models.user import User, Membership
from app.schemas.exam import SubmissionAnswerRead, SubmissionRead, SubmissionWithAnswers
from app.audit.runs import create_run
from app.worker import grade_submission_task

router = APIRouter()
logger = structlog.get_logger(__name__)

ALLOWED_SUBMISSION_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"}


def _submission_dir(exam_id: UUID, submission_id: UUID) -> Path:
    # One directory per submission: PDF page images are written next to the upload,
    # so sharing a directory let two uploads with the same file name overwrite each other.
    return settings.UPLOAD_DIR / "submissions" / str(exam_id) / str(submission_id)


async def _save_upload(file: UploadFile, destination_dir: Path) -> Path:
    """Validate and store an uploaded answer sheet. Never trusts the client file name."""
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_SUBMISSION_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{extension or 'unknown'}'. "
                   f"Allowed: {', '.join(sorted(ALLOWED_SUBMISSION_EXTENSIONS))}",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")

    destination_dir.mkdir(parents=True, exist_ok=True)
    file_path = destination_dir / f"answer_sheet{extension}"
    file_path.write_bytes(contents)
    return file_path


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
    file: UploadFile = File(...),
    student_id: Optional[UUID] = Form(None),  # Student's membership id
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Upload a student answer sheet for grading.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    student_membership_id = _resolve_student(db, student_id=student_id, org_id=exam.org_id)

    if not crud.question.get_by_exam(db, exam_id=exam_id):
        raise HTTPException(status_code=400, detail="Add questions to the exam before uploading answer sheets")

    # TODO: Move to object storage (MinIO/S3) instead of the local upload dir
    submission_id = uuid4()
    file_path = await _save_upload(file, _submission_dir(exam_id, submission_id))

    db_submission = crud.submission.create(
        db,
        obj_in={
            "id": submission_id,
            "exam_id": exam_id,
            "original_file_url": str(file_path),
            "status": SubmissionStatus.PENDING,
            "student_membership_id": student_membership_id,
        },
    )

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


@router.get("/submissions/{submission_id}", response_model=SubmissionWithAnswers)
def read_submission(
    *,
    db: Session = Depends(deps.get_session),
    submission_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific submission with its graded answers.
    """
    submission = crud.submission.get(db, id=submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    exam = crud.exam.get(db, id=submission.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Submission not found")

    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id)
    # Students may only see their own submission
    if (
        membership is not None
        and membership.role == Role.STUDENT
        and submission.student_membership_id != membership.id
    ):
        raise HTTPException(status_code=404, detail="Submission not found")

    answers = crud.submission_answer.get_by_submission(db, submission_id=submission_id)
    return SubmissionWithAnswers(
        **SubmissionRead.model_validate(submission).model_dump(),
        answers=[SubmissionAnswerRead.model_validate(a) for a in answers],
    )


@router.post("/submissions/{submission_id}/regrade", response_model=SubmissionRead)
def regrade_submission(
    *,
    db: Session = Depends(deps.get_session),
    submission_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Re-run the grading pipeline for a submission (e.g. after a failure or a rubric change).
    """
    submission = crud.submission.get(db, id=submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    exam = crud.exam.get(db, id=submission.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Submission not found")
    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)

    if submission.status in (SubmissionStatus.PENDING, SubmissionStatus.PROCESSING):
        raise HTTPException(status_code=409, detail="Submission is already being graded")

    submission = crud.submission.update(
        db,
        db_obj=submission,
        obj_in={"status": SubmissionStatus.PENDING, "current_step": "Queued for regrading"},
    )
    run = create_run(
        db, submission_id=submission.id, trigger="regrade",
        created_by_membership_id=membership.id if membership else None,
    )
    grade_submission_task.delay(str(run.id))
    return submission
