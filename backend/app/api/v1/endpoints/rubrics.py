"""Parsed rubric specs: view, edit, re-parse, and the exam overview. Staff only."""

from typing import Any, List
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app import crud
from app.api import deps
from app.models.exam import Exam, Question
from app.models.user import User
from app.rubrics import service
from app.rubrics.schema import RubricSpec, RubricSpecEdit
from app.schemas.rubric import QuestionRubricStatus, RubricSpecRead

logger = structlog.get_logger(__name__)

router = APIRouter()


def enqueue_parses(items: list[tuple[UUID, str]], *, force: bool = False) -> None:
    """Queue background parses. If the broker is down the question stays `pending` and grading
    parses it lazily, so a failed dispatch is logged, not raised."""
    from app.worker import parse_rubric_task

    for question_id, input_hash in items:
        try:
            parse_rubric_task.delay(str(question_id), input_hash, force)
        except Exception:
            logger.warning("rubric_parse_enqueue_failed", question_id=str(question_id), exc_info=True)


def _staff_exam(db: Session, exam_id: UUID, user: User) -> tuple[Exam, Any]:
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    membership = deps.require_org_role(db, user=user, org_id=exam.org_id, roles=deps.STAFF_ROLES)
    return exam, membership


def _exam_question(db: Session, exam: Exam, question_id: UUID) -> Question:
    question = crud.question.get(db, id=question_id)
    if not question or question.exam_id != exam.id:
        raise HTTPException(status_code=404, detail="Question not found in this exam")
    return question


@router.get("/{exam_id}/rubric-status", response_model=List[QuestionRubricStatus])
def read_rubric_status(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Rubric state of every question, in grading order: can each one be graded yet?"""
    exam, _ = _staff_exam(db, exam_id, current_user)
    questions = crud.question.get_by_exam(db, exam_id=exam.id)
    specs = service.current_specs(db, questions)
    rows = []
    for index, question in enumerate(questions):
        record = specs.get(question.id)
        spec = RubricSpec.model_validate(record.spec) if record else None
        rows.append(QuestionRubricStatus(
            question_id=question.id,
            label=f"Q{index + 1}",
            rubric_status=question.rubric_status,
            rubric_error=question.rubric_error,
            spec_version=record.version if record else None,
            source=record.source if record else None,
            kind=spec.kind if spec else None,
            subject=spec.subject if spec else None,
            derived=spec.derived if spec else None,
            criteria_count=len(spec.criteria) if spec else None,
            validation_errors=record.validation_errors if record else [],
            parser_warnings=spec.parser_warnings if spec else [],
        ))
    return rows


@router.get("/{exam_id}/questions/{question_id}/rubric-spec", response_model=RubricSpecRead)
def read_rubric_spec(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    question_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """The spec grading will use for this question's current text, rubric and max score."""
    exam, _ = _staff_exam(db, exam_id, current_user)
    question = _exam_question(db, exam, question_id)
    record = service.current_spec(db, question)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"message": "No rubric spec for this question yet", "rubric_status": question.rubric_status,
                    "rubric_error": question.rubric_error},
        )
    return record


@router.put("/{exam_id}/questions/{question_id}/rubric-spec", response_model=RubricSpecRead)
def update_rubric_spec(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    question_id: UUID,
    spec_in: RubricSpecEdit,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Replace the spec with the teacher's version. It must pass the same checks as a parsed one."""
    exam, membership = _staff_exam(db, exam_id, current_user)
    question = _exam_question(db, exam, question_id)
    record, errors = service.store_teacher_spec(
        db, question, spec_in, membership_id=membership.id if membership else None
    )
    if errors:
        raise HTTPException(status_code=422, detail={"message": "The rubric spec has problems", "errors": errors})
    return record


@router.post("/{exam_id}/questions/{question_id}/rubric-spec/reparse", status_code=202)
def reparse_rubric_spec(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    question_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Ask the model to parse the rubric again (e.g. after a bad parse). The result becomes the
    newest version, replacing a teacher's edit for the same inputs."""
    exam, _ = _staff_exam(db, exam_id, current_user)
    question = _exam_question(db, exam, question_id)
    input_hash = service.mark_reparse(db, question)
    db.commit()
    enqueue_parses([(question.id, input_hash)], force=True)
    return {"question_id": question.id, "rubric_status": question.rubric_status}
