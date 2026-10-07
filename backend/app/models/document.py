"""Uploaded documents and the pages made from them (Proposal 003).

A document is one uploaded file: a student's answer sheet (or one of several photos), and later
question papers, rubrics and blank copies. Its pages are derived data: upright, size-capped
images plus the text layer of digital PDF pages. Pages can always be re-made from the original.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel

from app.models.base import utcnow


class DocumentRole:
    """What the uploader says the document is (stored as VARCHAR)."""

    ANSWERS = "answers"
    # Exam-level documents (extraction comes in M4c)
    QUESTION_PAPER = "question_paper"
    RUBRIC = "rubric"
    QUESTION_PAPER_AND_RUBRIC = "question_paper_and_rubric"
    BLANK_COPY = "blank_copy"


class DocumentStatus:
    RECEIVED = "received"  # stored, not yet turned into pages
    READY = "ready"  # pages made
    FAILED = "failed"  # couldn't be turned into pages; `error` says why


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    exam_id: UUID = Field(foreign_key="exams.id", index=True)
    submission_id: Optional[UUID] = Field(default=None, foreign_key="submissions.id", index=True)
    role: str
    position: int = 0  # order within a submission (photos of pages 1, 2, 3 ...)
    original_filename: str  # untrusted; for display only
    stored_path: str
    sha256: str
    size_bytes: int
    kind: str  # FileKind, from the file's bytes
    status: str = DocumentStatus.RECEIVED
    error: Optional[str] = None
    page_count: Optional[int] = None
    created_by_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
    created_at: datetime = Field(default_factory=utcnow)


class DocumentPage(SQLModel, table=True):
    __tablename__ = "document_pages"
    __table_args__ = (UniqueConstraint("document_id", "page_index", name="uq_document_pages_document_index"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="documents.id", index=True)
    page_index: int  # 0-based, in document order
    kind: str  # PageKind: digital / mixed / scanned / photo / text
    image_path: Optional[str] = None  # None for plain-text pages
    image_sha256: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    dpi: Optional[int] = None
    text_layer: Optional[str] = None  # trustworthy typed text (digital/mixed PDF pages, text files)
    created_at: datetime = Field(default_factory=utcnow)
