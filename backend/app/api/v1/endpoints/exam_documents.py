"""Exam documents (question papers, rubrics, blank copies) and the drafts extracted from them.
Staff only. Flow: upload documents -> create a draft (extracted in the background) -> check / edit
-> confirm (creates the exam's questions and queues their rubric parsing)."""

from typing import Any, List
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlmodel import Session, select

from app import crud
from app.api import deps
from app.api.uploads import validated
from app.api.v1.endpoints.exams import _question_reads
from app.api.v1.endpoints.rubrics import enqueue_parses
from app.core.config import settings
from app.exam_drafts import service as drafts
from app.exam_drafts.schema import DraftContent, Issue
from app.ingestion.service import store_upload
from app.models.base import utcnow
from app.models.document import Document
from app.models.exam import Exam
from app.models.exam_draft import DraftStatus, ExamDraft
from app.models.user import User
from app.schemas.exam import QuestionRead
from app.schemas.exam_document import DocumentRead, DraftCreate, DraftEdit, DraftRead, DraftSummary

logger = structlog.get_logger(__name__)
router = APIRouter()


def _staff_exam(db: Session, exam_id: UUID, user: User) -> tuple[Exam, Any]:
    exam = crud.exam.get(db, id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam, deps.require_org_role(db, user=user, org_id=exam.org_id, roles=deps.STAFF_ROLES)


def _draft(db: Session, exam: Exam, draft_id: UUID) -> ExamDraft:
    draft = db.get(ExamDraft, draft_id)
    if draft is None or draft.exam_id != exam.id:
        raise HTTPException(status_code=404, detail="Draft not found in this exam")
    return draft


def _read(draft: ExamDraft) -> DraftRead:
    return DraftRead(
        id=draft.id, exam_id=draft.exam_id, version=draft.version, source=draft.source, status=draft.status,
        based_on_id=draft.based_on_id, document_ids=[UUID(i) for i in draft.document_ids],
        content=DraftContent.model_validate(draft.content) if draft.content else None,
        issues=[Issue.model_validate(i) for i in draft.issues], error=draft.error,
        created_at=draft.created_at, confirmed_at=draft.confirmed_at,
    )


@router.post("/{exam_id}/documents", response_model=List[DocumentRead])
async def upload_exam_documents(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    role: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Upload exam documents: role is question_paper, rubric, question_paper_and_rubric or blank_copy.
    Several files are one document each, in the order given."""
    exam, membership = _staff_exam(db, exam_id, current_user)
    if role not in drafts.EXAM_ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of: {', '.join(sorted(drafts.EXAM_ROLES))}")
    if len(files) > settings.MAX_FILES_PER_SUBMISSION:
        raise HTTPException(status_code=400, detail=f"At most {settings.MAX_FILES_PER_SUBMISSION} files at once")
    checked = [await validated(upload) for upload in files]
    documents = [
        store_upload(db, data=data, filename=name, kind=kind, org_id=exam.org_id, exam_id=exam.id, role=role,
                     position=position, membership_id=membership.id if membership else None)
        for position, (name, data, kind) in enumerate(checked)
    ]
    db.commit()
    for document in documents:
        db.refresh(document)
    return documents


@router.get("/{exam_id}/documents", response_model=List[DocumentRead])
def list_exam_documents(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, current_user: User = Depends(deps.get_current_user)
) -> Any:
    exam, _ = _staff_exam(db, exam_id, current_user)
    return db.exec(
        select(Document).where(
            Document.exam_id == exam.id, Document.submission_id == None, Document.deleted_at == None  # noqa: E711
        ).order_by(Document.created_at, Document.position)
    ).all()


@router.delete("/{exam_id}/documents/{document_id}", status_code=204)
def delete_exam_document(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    document_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Response:
    """Soft-delete an exam document (the file stays on disk). Refused while a confirmed draft uses it."""
    exam, _ = _staff_exam(db, exam_id, current_user)
    document = db.get(Document, document_id)
    if document is None or document.exam_id != exam.id or document.submission_id is not None \
            or document.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Document not found in this exam")
    confirmed = db.exec(
        select(ExamDraft).where(ExamDraft.exam_id == exam.id, ExamDraft.status == DraftStatus.CONFIRMED)
        .order_by(ExamDraft.version)
    ).all()
    used_by = next((d for d in confirmed if str(document.id) in d.document_ids), None)
    if used_by is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Draft version {used_by.version} ({used_by.id}) was confirmed from this document; it can't be deleted.",
        )
    document.deleted_at = utcnow()
    db.add(document)
    db.commit()
    logger.info("exam_document_deleted", exam_id=str(exam.id), document_id=str(document.id))
    return Response(status_code=204)


@router.post("/{exam_id}/drafts", response_model=DraftRead, status_code=202)
def create_exam_draft(
    *,
    db: Session = Depends(deps.get_session),
    exam_id: UUID,
    body: DraftCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Extract the exam's questions and rubrics from these documents, in the background."""
    exam, membership = _staff_exam(db, exam_id, current_user)
    try:
        draft = drafts.create_draft(db, exam, body.document_ids, membership.id if membership else None)
    except drafts.DraftError as e:
        raise HTTPException(status_code=400, detail=str(e))
    from app.worker import extract_exam_task

    try:
        extract_exam_task.delay(str(draft.id))
    except Exception:
        logger.warning("exam_extraction_enqueue_failed", draft_id=str(draft.id), exc_info=True)
        draft.status, draft.error = DraftStatus.FAILED, "Couldn't start the extraction. Try again."
        db.add(draft)
        db.commit()
    return _read(draft)


@router.get("/{exam_id}/drafts", response_model=List[DraftSummary])
def list_exam_drafts(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, current_user: User = Depends(deps.get_current_user)
) -> Any:
    exam, _ = _staff_exam(db, exam_id, current_user)
    rows = db.exec(select(ExamDraft).where(ExamDraft.exam_id == exam.id).order_by(ExamDraft.version.desc())).all()
    return [
        DraftSummary(
            id=d.id, version=d.version, source=d.source, status=d.status, based_on_id=d.based_on_id,
            question_count=len(d.content["questions"]) if d.content else None,
            blocking=sum(1 for i in d.issues if i["severity"] == "blocking"),
            warnings=sum(1 for i in d.issues if i["severity"] == "warning"),
            created_at=d.created_at, confirmed_at=d.confirmed_at,
        )
        for d in rows
    ]


@router.get("/{exam_id}/drafts/{draft_id}", response_model=DraftRead)
def read_exam_draft(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, draft_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    exam, _ = _staff_exam(db, exam_id, current_user)
    return _read(_draft(db, exam, draft_id))


@router.put("/{exam_id}/drafts/{draft_id}", response_model=DraftRead, status_code=201)
def edit_exam_draft(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, draft_id: UUID, body: DraftEdit,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Save the teacher's corrections as a new version; the checks run again."""
    exam, membership = _staff_exam(db, exam_id, current_user)
    try:
        version = drafts.save_teacher_version(db, _draft(db, exam, draft_id), body.content,
                                              membership.id if membership else None)
    except drafts.DraftError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return _read(version)


@router.post("/{exam_id}/drafts/{draft_id}/confirm", response_model=List[QuestionRead])
def confirm_exam_draft(
    *, db: Session = Depends(deps.get_session), exam_id: UUID, draft_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create or update the exam's questions from the draft, then parse their rubrics."""
    exam, membership = _staff_exam(db, exam_id, current_user)
    try:
        to_parse = drafts.confirm_draft(db, _draft(db, exam, draft_id), membership.id if membership else None)
    except drafts.DraftError as e:
        raise HTTPException(status_code=409, detail={"message": str(e), "issues": [i.model_dump() for i in e.issues]})
    enqueue_parses(to_parse)
    return _question_reads(db, crud.question.get_by_exam(db, exam_id=exam.id))
