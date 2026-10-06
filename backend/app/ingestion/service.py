"""Store uploads as documents and turn them into pages (idempotent; safe to call again)."""

import hashlib
from pathlib import Path
from typing import Iterator, Optional
from uuid import UUID, uuid4

import structlog
from sqlmodel import Session, delete, select

from app.core.config import settings
from app.ingestion.formats import DOCUMENT_KINDS, IMAGE_KINDS, OFFICE_KINDS, TEXT_KINDS, FileKind, sniff
from app.ingestion.office import convert_to_pdf
from app.ingestion.pages import DocumentError, RenderedPage, render_image, render_pdf, render_text
from app.models.document import Document, DocumentPage, DocumentRole, DocumentStatus
from app.models.exam import Submission

logger = structlog.get_logger(__name__)

_EXTENSION = {
    FileKind.PDF: ".pdf", FileKind.DOCX: ".docx", FileKind.DOC: ".doc", FileKind.ODT: ".odt",
    FileKind.RTF: ".rtf", FileKind.PPTX: ".pptx", FileKind.TXT: ".txt", FileKind.MARKDOWN: ".md",
    FileKind.JPEG: ".jpg", FileKind.PNG: ".png", FileKind.WEBP: ".webp", FileKind.HEIC: ".heic",
    FileKind.TIFF: ".tiff", FileKind.GIF: ".gif", FileKind.BMP: ".bmp",
}


def _documents_dir() -> Path:
    path = settings.UPLOAD_DIR / "documents"
    path.mkdir(parents=True, exist_ok=True)
    return path


def store_upload(
    db: Session,
    *,
    data: bytes,
    filename: str,
    kind: FileKind,
    org_id: UUID,
    exam_id: UUID,
    role: str,
    submission_id: Optional[UUID] = None,
    position: int = 0,
    membership_id: Optional[UUID] = None,
) -> Document:
    """Save a validated upload under a generated name and add its `documents` row (caller commits)."""
    document_id = uuid4()
    path = _documents_dir() / f"{document_id}{_EXTENSION[kind]}"
    path.write_bytes(data)
    document = Document(
        id=document_id,
        org_id=org_id,
        exam_id=exam_id,
        submission_id=submission_id,
        role=role,
        position=position,
        original_filename=Path(filename).name[:255],
        stored_path=str(path),
        sha256=hashlib.sha256(data).hexdigest(),
        size_bytes=len(data),
        kind=kind.value,
        created_by_membership_id=membership_id,
    )
    db.add(document)
    return document


def _render(document: Document) -> Iterator[RenderedPage]:
    kind = FileKind(document.kind)
    path = Path(document.stored_path)
    if not path.exists():
        raise DocumentError("The uploaded file is missing from storage.")
    if kind == FileKind.PDF:
        return render_pdf(path)
    if kind in OFFICE_KINDS:
        converted = _documents_dir() / f"{document.id}.converted.pdf"
        if not converted.exists():
            converted.write_bytes(convert_to_pdf(path.read_bytes(), f"document{_EXTENSION[kind]}"))
        return render_pdf(converted)
    if kind in IMAGE_KINDS:
        return render_image(path, kind)
    if kind in TEXT_KINDS:
        return render_text(path)
    raise DocumentError(f"{kind.value} files can't be turned into pages.")


def pages_of(db: Session, document: Document) -> list[DocumentPage]:
    return list(db.exec(
        select(DocumentPage).where(DocumentPage.document_id == document.id).order_by(DocumentPage.page_index)
    ).all())


def ensure_pages(db: Session, document: Document) -> list[DocumentPage]:
    """The document's pages, making them first if needed. Raises DocumentError if it can't be read."""
    if document.status == DocumentStatus.READY:
        return pages_of(db, document)

    pages_dir = settings.UPLOAD_DIR / "pages" / str(document.id)
    pages_dir.mkdir(parents=True, exist_ok=True)
    rows: list[DocumentPage] = []
    try:
        for index, page in enumerate(_render(document)):
            row = DocumentPage(document_id=document.id, page_index=index, kind=page.kind, dpi=page.dpi,
                               text_layer=page.text)
            if page.image is not None:
                image_path = pages_dir / f"{index:04d}.jpg"
                page.image.save(image_path, "JPEG", quality=90)
                row.image_path = str(image_path)
                row.image_sha256 = hashlib.sha256(image_path.read_bytes()).hexdigest()
                row.width, row.height = page.image.size
            rows.append(row)
    except DocumentError as e:
        document.status, document.error = DocumentStatus.FAILED, str(e)
        db.add(document)
        db.commit()
        logger.warning("document_unreadable", document_id=str(document.id), error=str(e))
        raise

    db.exec(delete(DocumentPage).where(DocumentPage.document_id == document.id))  # a retried, failed attempt
    db.add_all(rows)
    document.status, document.error, document.page_count = DocumentStatus.READY, None, len(rows)
    db.add(document)
    db.commit()
    logger.info("document_pages_ready", document_id=str(document.id), pages=len(rows), kind=document.kind)
    return pages_of(db, document)


def submission_documents(db: Session, submission: Submission) -> list[Document]:
    """A submission's answer documents in upload order. Submissions made before documents existed
    (a single file path) are adopted as one document."""
    documents = list(db.exec(
        select(Document).where(Document.submission_id == submission.id).order_by(Document.position)
    ).all())
    if documents or not submission.original_file_url:
        return documents

    path = Path(submission.original_file_url)
    if not path.is_file():
        raise DocumentError("The answer sheet file is missing from storage.")
    data = path.read_bytes()
    kind = sniff(data)
    if kind is None or kind not in DOCUMENT_KINDS:
        raise DocumentError("The answer sheet isn't in a supported format.")
    exam = submission.exam
    document = Document(
        org_id=exam.org_id, exam_id=exam.id, submission_id=submission.id, role=DocumentRole.ANSWERS,
        original_filename=path.name, stored_path=str(path), sha256=hashlib.sha256(data).hexdigest(),
        size_bytes=len(data), kind=kind.value,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return [document]


def submission_pages(db: Session, submission: Submission) -> list[DocumentPage]:
    """Every page of a submission, in order across its documents."""
    pages: list[DocumentPage] = []
    for document in submission_documents(db, submission):
        pages.extend(ensure_pages(db, document))
    if not pages:
        raise DocumentError("The submission has no answer pages.")
    if len(pages) > settings.MAX_PAGES_PER_SUBMISSION:
        raise DocumentError(f"The submission has {len(pages)} pages; the limit is {settings.MAX_PAGES_PER_SUBMISSION}.")
    return pages
