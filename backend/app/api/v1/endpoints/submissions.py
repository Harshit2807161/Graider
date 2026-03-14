from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks
from sqlmodel import Session, select

from app import crud
from app.api import deps
from app.models.user import User, Membership
from app.schemas.exam import SubmissionRead, SubmissionWithAnswers
from app.schemas.grading import ProcessingStatus
from app.services.grading_service import run_grading_pipeline
from app.core.constants import Role

router = APIRouter()

@router.post("/exams/{exam_id}/submissions", response_model=SubmissionRead)
async def create_submission(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    file: UploadFile = File(...),
    student_id: Optional[UUID] = None, # Optional if we use OCR to identify student
    current_user: User = Depends(deps.get_current_user),
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Upload a student answer sheet for grading.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Verify permission (Teacher or Admin in that org)
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == exam.org_id)
    ).first()
    
    if not membership or membership.role not in [Role.OWNER, Role.ADMIN, Role.TEACHER]:
        raise HTTPException(status_code=403, detail="Not enough permissions to upload submissions")

    # TODO: In a real app, we would save the file to MinIO and get a URL
    # For now, we'll use a placeholder URL and save to a local folder for the pipeline
    file_path = f"uploads/submissions/{exam_id}/{file.filename}"
    
    # Create the submission record in PostgreSQL
    submission_in = {
        "exam_id": exam_id,
        "original_file_url": file_path,
        "status": "pending"
    }
    if student_id:
        submission_in["student_membership_id"] = student_id
        
    db_submission = crud.submission.create(db, obj_in=submission_in)
    
    # Trigger grading pipeline in background
    # Note: Phase 2 will involve refactoring run_grading_pipeline to work with this!
    # For now, we just log it.
    
    return db_submission

@router.get("/{submission_id}", response_model=SubmissionWithAnswers)
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
    
    # Verify permission
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == exam.org_id)
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return submission
