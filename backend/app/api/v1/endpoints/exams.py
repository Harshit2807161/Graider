from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
import io
import pandas as pd
from sqlmodel import Session, select

from app import crud
from app.api import deps
from app.models.user import User, Membership
from app.schemas.exam import ExamCreate, ExamUpdate, ExamRead, ExamWithQuestions, QuestionCreate, QuestionRead
from app.core.constants import Role

router = APIRouter()

@router.post("/", response_model=ExamRead)
def create_exam(
    *,
    db: Session = Depends(deps.get_session),
    exam_in: ExamCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new exam.
    """
    # Verify org exists
    org = crud.org.get(db, id=exam_in.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Verify user is member of org and has permission (Admin/Teacher/Owner)
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == exam_in.org_id)
    ).first()
    
    if not membership or membership.role not in [Role.OWNER, Role.ADMIN, Role.TEACHER]:
        raise HTTPException(status_code=403, detail="Not enough permissions in this organization")

    # Create exam
    exam = crud.exam.create(
        db, 
        obj_in=exam_in, 
        created_by_membership_id=membership.id
    )
    
    return exam

@router.get("/", response_model=List[ExamRead])
def read_exams(
    org_id: UUID,
    batch_id: Optional[UUID] = None,
    db: Session = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve exams for an organization or batch.
    """
    # Verify membership
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == org_id)
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    if batch_id:
        exams = crud.exam.get_by_batch(db, batch_id=batch_id, skip=skip, limit=limit)
    else:
        # Use specialized method to include question counts
        exams = crud.exam.get_with_question_count(db, org_id=org_id, skip=skip, limit=limit)
        
    return exams

@router.get("/{exam_id}", response_model=ExamWithQuestions)
def read_exam(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific exam by ID with questions.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Verify membership
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == exam.org_id)
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return exam

@router.patch("/{exam_id}", response_model=ExamRead)
def update_exam(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    exam_in: ExamUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update an exam.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Verify permission
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == exam.org_id)
    ).first()
    
    if not membership or membership.role not in [Role.OWNER, Role.ADMIN, Role.TEACHER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    exam = crud.exam.update(db, db_obj=exam, obj_in=exam_in)
    return exam

@router.delete("/{exam_id}")
def delete_exam(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete an exam.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Verify permission
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == exam.org_id)
    ).first()
    
    if not membership or membership.role not in [Role.OWNER, Role.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    crud.exam.remove(db, id=exam_id)
    return {"status": "deleted"}

# --- Question Endpoints ---

@router.post("/{exam_id}/questions", response_model=List[QuestionRead])
def sync_exam_questions(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    questions_in: List[QuestionCreate],
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Sync (Create/Overwrite) questions for an exam.
    This endpoint replaces existing questions with the new list.
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Verify permission
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == exam.org_id)
    ).first()
    
    if not membership or membership.role not in [Role.OWNER, Role.ADMIN, Role.TEACHER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Delete existing questions (due to cascade delete-orphan, we just clear the list)
    # But SqlModel relationships might need explicit clearing if not using a set
    existing_questions = crud.question.get_by_exam(db, exam_id=exam_id)
    for q in existing_questions:
        db.delete(q) # Explicitly delete for now to be safe
    
    # Create new questions
    new_questions = []
    for q_in in questions_in:
        db_question = crud.question.create(db, obj_in=q_in, exam_id=exam_id)
        new_questions.append(db_question)
    
    db.commit()
    return new_questions

@router.post("/{exam_id}/questions/upload", response_model=List[QuestionRead])
async def upload_exam_questions_excel(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Seed/Append questions for an exam via an uploaded Excel file.
    Expects columns: question_text, max_score, rubric_criteria, question_type (optional).
    """
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    membership = db.exec(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .where(Membership.org_id == exam.org_id)
    ).first()
    
    if not membership or membership.role not in [Role.OWNER, Role.ADMIN, Role.TEACHER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = [str(c).lower().strip() for c in df.columns]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file. Error: {str(e)}")
        
    # Define mapping of possible column names to our internal schema for robustness
    mapping = {
        'question_text': ['question_text', 'question text', 'question', 'text'],
        'max_score': ['max_score', 'max score', 'score', 'points', 'max_score'],
        'rubric_criteria': ['rubric_criteria', 'rubric criteria', 'rubric', 'criteria'],
        'question_type': ['question_type', 'question type', 'type']
    }
    
    # Helper to find the actual column in df from a list of aliases
    def get_actual_col(aliases):
        for alias in aliases:
            if alias in df.columns: return alias
        return None

    actual_question_col = get_actual_col(mapping['question_text'])
    actual_score_col = get_actual_col(mapping['max_score'])
    actual_rubric_col = get_actual_col(mapping['rubric_criteria'])
    actual_type_col = get_actual_col(mapping['question_type'])

    if not actual_question_col or not actual_score_col:
        raise HTTPException(status_code=400, detail=f"Excel file missing required columns. We need a question/text column and a score/points column. Provided: {list(df.columns)}")

    existing_questions = crud.question.get_by_exam(db, exam_id=exam_id)
    start_index = len(existing_questions) + 1
    
    new_questions = []
    for idx, row in df.iterrows():
        try:
            # Safely extract values using the mapped column names
            q_text = str(row[actual_question_col])
            m_score = float(row[actual_score_col]) # Use float to be safe
            r_crit = str(row[actual_rubric_col]) if actual_rubric_col and pd.notna(row[actual_rubric_col]) else None
            q_type = str(row[actual_type_col]) if actual_type_col and pd.notna(row[actual_type_col]) else 'descriptive'

            q_in = QuestionCreate(
                question_text=q_text,
                max_score=m_score,
                rubric_criteria=r_crit,
                question_type=q_type,
                order_index=start_index + idx
            )
            db_question = crud.question.create(db, obj_in=q_in, exam_id=exam_id)
            new_questions.append(db_question)
        except Exception as e:
            continue
            
    db.commit()
    return new_questions

