from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
import io
import pandas as pd
from pydantic import ValidationError
from sqlmodel import Session, func, select

from app import crud
from app.api import deps
from app.models.exam import Exam, Submission
from app.models.user import User
from app.schemas.exam import (
    ExamCreate,
    ExamUpdate,
    ExamRead,
    ExamSubmissionCounts,
    ExamsSummary,
    ExamWithQuestions,
    GradingSettings,
    GradingSettingsUpdate,
    QuestionCreate,
    QuestionRead,
    QuestionSync,
    StudentExamWithQuestions,
    StudentQuestionRead,
    StatusCounts,
)
from app.api.deps import STAFF_ROLES
from app.core.constants import QuestionType, SubmissionStatus
from app.models.base import utcnow
from app.models.exam import Question
from app.rubrics import service as rubric_service
from app.rubrics.schema import RubricSpec
from app.api.v1.endpoints.rubrics import enqueue_parses
from app.grading.question import ExamSettings
from app.services.labels import duplicate_labels

router = APIRouter()

# Spreadsheet values accepted for question_type, mapped onto the supported enum
QUESTION_TYPE_ALIASES = {
    "descriptive": QuestionType.DESCRIPTIVE,
    "short_answer": QuestionType.DESCRIPTIVE,
    "short answer": QuestionType.DESCRIPTIVE,
    "essay": QuestionType.DESCRIPTIVE,
    "long_answer": QuestionType.DESCRIPTIVE,
    "mcq": QuestionType.MCQ,
    "multiple choice": QuestionType.MCQ,
    "multiple_choice": QuestionType.MCQ,
    "problem": QuestionType.PROBLEM,
    "numerical": QuestionType.PROBLEM,
}


def _get_exam_or_404(db: Session, exam_id: UUID) -> Exam:
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


def _validate_batch(db: Session, *, batch_id: Optional[UUID], org_id: UUID) -> None:
    """A batch attached to an exam must exist and belong to the exam's org."""
    if batch_id is None:
        return
    batch = crud.batch.get(db, id=batch_id)
    if not batch or batch.org_id != org_id:
        raise HTTPException(status_code=400, detail="Batch not found in this organization")


def _question_reads(db: Session, questions: List[Question]) -> List[QuestionRead]:
    """Questions with a summary of their current rubric spec."""
    specs = rubric_service.current_specs(db, questions)
    reads = []
    for q in questions:
        read = QuestionRead.model_validate(q)
        record = specs.get(q.id)
        if record is not None:
            spec = RubricSpec.model_validate(record.spec)
            label = "Pass/fail" if spec.kind == "pass_fail" else f"{len(spec.criteria)} criteria"
            read.rubric_derived = spec.derived
            read.rubric_summary = f"{label} ({spec.subject})"
        reads.append(read)
    return reads


def _exam_with_questions(db: Session, exam: Exam) -> ExamWithQuestions:
    # exam.questions would include soft-deleted rows in arbitrary order
    questions = crud.question.get_by_exam(db, exam_id=exam.id)
    data = ExamRead.model_validate(exam).model_dump()
    data["question_count"] = len(questions)
    return ExamWithQuestions(**data, questions=_question_reads(db, questions))


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

    membership = deps.get_membership(db, user=current_user, org_id=exam_in.org_id)
    # The exam records its creator's membership, so even superusers need one here
    if not membership or membership.role not in deps.STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions in this organization")

    _validate_batch(db, batch_id=exam_in.batch_id, org_id=exam_in.org_id)

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
    deps.require_org_role(db, user=current_user, org_id=org_id)

    if batch_id:
        # Scoped by org too, so a batch id from another org can't leak its exams
        exams = crud.exam.get_by_batch(db, org_id=org_id, batch_id=batch_id, skip=skip, limit=limit)
    else:
        # Use specialized method to include question counts
        exams = crud.exam.get_with_question_count(db, org_id=org_id, skip=skip, limit=limit)

    return exams

@router.get("/summary", response_model=ExamsSummary)
def read_exams_summary(
    org_id: UUID,
    db: Session = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user),
) -> ExamsSummary:
    """Answer sheets of every exam in the org, counted by status (one GROUP BY)."""
    deps.require_org_role(db, user=current_user, org_id=org_id, roles=STAFF_ROLES)
    rows = db.exec(
        select(Submission.exam_id, Submission.status, func.count())
        .join(Exam, Exam.id == Submission.exam_id)
        .where(Exam.org_id == org_id, Exam.deleted_at.is_(None), Submission.deleted_at.is_(None))
        .group_by(Submission.exam_id, Submission.status)
    ).all()
    per_exam: dict[UUID, ExamSubmissionCounts] = {}
    totals = StatusCounts()
    for exam_id, status, count in rows:
        counts = per_exam.setdefault(exam_id, ExamSubmissionCounts(exam_id=exam_id))
        field = SubmissionStatus(status).value.lower()
        for target in (counts, totals):
            setattr(target, field, getattr(target, field) + count)
            target.total += count
    return ExamsSummary(exams=list(per_exam.values()), totals=totals)


@router.get(
    "/{exam_id}",
    response_model=ExamWithQuestions,
    responses={200: {"description": "Students get StudentExamWithQuestions (no rubric fields)"}},
)
def read_exam(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific exam by ID with questions.
    """
    exam = _get_exam_or_404(db, exam_id)
    membership = deps.require_org_role(db, user=current_user, org_id=exam.org_id)
    full = _exam_with_questions(db, exam)
    if current_user.is_superuser or (membership is not None and membership.role in deps.STAFF_ROLES):
        return full
    # Students never see rubric text, parsed specs or rubric status
    reduced = StudentExamWithQuestions(
        **full.model_dump(exclude={"questions"}),
        questions=[StudentQuestionRead.model_validate(q.model_dump()) for q in full.questions],
    )
    return JSONResponse(jsonable_encoder(reduced))

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
    exam = _get_exam_or_404(db, exam_id)
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)

    if "batch_id" in exam_in.model_fields_set:
        _validate_batch(db, batch_id=exam_in.batch_id, org_id=exam.org_id)

    exam = crud.exam.update(db, db_obj=exam, obj_in=exam_in)
    return exam

def _grading_settings(exam: Exam) -> GradingSettings:
    config = exam.config or {}
    effective = ExamSettings.of(config)
    return GradingSettings(agreement_threshold=effective.agreement_threshold, spot_check_rate=effective.spot_check_rate,
                           choice_policy=config.get("choice_policy", "best"))


@router.get("/{exam_id}/grading-settings", response_model=GradingSettings)
def read_grading_settings(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """The exam's grading settings: agreement threshold, spot-check rate, choice policy."""
    exam = _get_exam_or_404(db, exam_id)
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    return _grading_settings(exam)


@router.patch("/{exam_id}/grading-settings", response_model=GradingSettings)
def update_grading_settings(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    settings_in: GradingSettingsUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Change the exam's grading settings; the next grading run uses them (and records them)."""
    exam = _get_exam_or_404(db, exam_id)
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    exam.config = {**(exam.config or {}), **settings_in.model_dump(exclude_unset=True)}
    exam.updated_at = utcnow()
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return _grading_settings(exam)


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
    exam = _get_exam_or_404(db, exam_id)
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.ADMIN_ROLES)

    crud.exam.remove(db, id=exam_id)
    return {"status": "deleted"}

# --- Question Endpoints ---

@router.post("/{exam_id}/questions", response_model=List[QuestionRead])
def sync_exam_questions(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    questions_in: List[QuestionSync],
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Sync questions for an exam: the request body is the full, desired question list.

    Questions sent with an `id` are updated in place, questions without one are created,
    and existing questions missing from the list are soft-deleted. Updating in place keeps
    graded answers pointing at the right question (a hard delete would orphan them).
    """
    exam = _get_exam_or_404(db, exam_id)
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)

    existing = {q.id: q for q in crud.question.get_by_exam(db, exam_id=exam_id)}

    unknown_ids = [str(q.id) for q in questions_in if q.id is not None and q.id not in existing]
    if unknown_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Questions not found in this exam: {', '.join(unknown_ids)}",
        )
    duplicates = duplicate_labels([q.label for q in questions_in])
    if duplicates:
        raise HTTPException(status_code=400, detail=f"Question labels must be unique: {', '.join(duplicates)}")

    now = utcnow()
    kept_ids = set()
    live = []
    for q_in in questions_in:
        fields = q_in.model_dump(exclude={"id"})
        if q_in.id is not None:
            db_question = existing[q_in.id]
            for key, value in fields.items():
                setattr(db_question, key, value)
            kept_ids.add(q_in.id)
        else:
            db_question = crud.question.model(**fields, exam_id=exam_id)
        db.add(db_question)
        live.append(db_question)

    for q_id, db_question in existing.items():
        if q_id not in kept_ids:
            db_question.deleted_at = now
            db.add(db_question)

    # Questions whose text, rubric, max score or type changed get their rubric re-parsed
    to_parse = rubric_service.mark_changed(db, live)
    db.commit()
    enqueue_parses(to_parse)
    return _question_reads(db, crud.question.get_by_exam(db, exam_id=exam_id))

@router.post("/{exam_id}/questions/upload", response_model=List[QuestionRead])
async def upload_exam_questions_excel(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Append questions to an exam from an uploaded Excel file.
    Expects columns: question_text, max_score, rubric_criteria (optional), question_type (optional).

    The import is all-or-nothing: if any row is invalid, nothing is saved and the
    response lists every bad row.
    """
    exam = _get_exam_or_404(db, exam_id)
    deps.require_org_role(db, user=current_user, org_id=exam.org_id, roles=deps.STAFF_ROLES)

    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = [str(c).lower().strip() for c in df.columns]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file. Error: {str(e)}")

    # Define mapping of possible column names to our internal schema for robustness
    mapping = {
        'question_text': ['question_text', 'question text', 'question', 'text'],
        'max_score': ['max_score', 'max score', 'score', 'points', 'marks'],
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
    next_index = max((q.order_index for q in existing_questions), default=0) + 1

    parsed: List[QuestionCreate] = []
    errors: List[str] = []
    # Row numbers in messages match what the user sees in Excel (header is row 1)
    for row_number, (_, row) in enumerate(df.iterrows(), start=2):
        raw_text = row[actual_question_col]
        if pd.isna(raw_text) or not str(raw_text).strip():
            # Fully blank rows are common at the end of sheets; skip them silently
            if all(pd.isna(v) for v in row.values):
                continue
            errors.append(f"Row {row_number}: question text is empty")
            continue

        try:
            max_score = float(row[actual_score_col])
        except (TypeError, ValueError):
            errors.append(f"Row {row_number}: max score '{row[actual_score_col]}' is not a number")
            continue
        if pd.isna(max_score) or max_score <= 0:
            errors.append(f"Row {row_number}: max score must be a positive number")
            continue

        question_type = QuestionType.DESCRIPTIVE
        if actual_type_col and pd.notna(row[actual_type_col]):
            raw_type = str(row[actual_type_col]).strip().lower()
            question_type = QUESTION_TYPE_ALIASES.get(raw_type)
            if question_type is None:
                errors.append(
                    f"Row {row_number}: unknown question type '{raw_type}' "
                    f"(use one of: {', '.join(sorted(QUESTION_TYPE_ALIASES))})"
                )
                continue

        rubric = None
        if actual_rubric_col and pd.notna(row[actual_rubric_col]):
            rubric = str(row[actual_rubric_col]).strip() or None

        try:
            parsed.append(QuestionCreate(
                question_text=str(raw_text).strip(),
                max_score=max_score,
                rubric_criteria=rubric,
                question_type=question_type,
                order_index=next_index + len(parsed),
            ))
        except ValidationError as e:
            errors.append(f"Row {row_number}: {e.errors()[0]['msg']}")

    if errors:
        raise HTTPException(status_code=400, detail={"message": "No questions were imported", "errors": errors})
    if not parsed:
        raise HTTPException(status_code=400, detail="The file contains no questions")

    new_questions = []
    for q_in in parsed:
        db_question = crud.question.model(**q_in.model_dump(), exam_id=exam_id)
        db.add(db_question)
        new_questions.append(db_question)
    to_parse = rubric_service.mark_changed(db, new_questions)
    db.commit()
    enqueue_parses(to_parse)
    for q in new_questions:
        db.refresh(q)
    return _question_reads(db, new_questions)
