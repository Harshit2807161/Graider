"""File upload endpoints for Gr8r."""

import shutil
from pathlib import Path
from typing import List, Optional
from uuid import UUID

import structlog
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ...config import get_settings
from ...models.database import get_database
from ...models.schemas import ProcessingStatus, UploadResponse

router = APIRouter()
logger = structlog.get_logger(__name__)

# Allowed file types
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/jpg",  # Some browsers send this
}
ALLOWED_PDF_TYPE = "application/pdf"
ALLOWED_TEXT_TYPES = {"text/plain", "text/markdown", "application/json"}

# Combined allowed types for different upload categories
ALLOWED_DOCUMENT_TYPES = ALLOWED_IMAGE_TYPES | {ALLOWED_PDF_TYPE}
ALLOWED_RUBRIC_TYPES = ALLOWED_DOCUMENT_TYPES | ALLOWED_TEXT_TYPES


def get_content_type(file: UploadFile) -> str:
    """Get content type, with fallback based on file extension."""
    content_type = file.content_type

    # Fallback to extension-based detection if content_type is missing or generic
    if not content_type or content_type == "application/octet-stream":
        if file.filename:
            ext = Path(file.filename).suffix.lower()
            ext_map = {
                ".pdf": "application/pdf",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".txt": "text/plain",
                ".md": "text/markdown",
                ".json": "application/json",
            }
            content_type = ext_map.get(ext, content_type)

    return content_type or "application/octet-stream"


def validate_files(files: List[UploadFile], file_type: str) -> None:
    """Validate uploaded files based on their type category."""
    if not files:
        raise HTTPException(status_code=400, detail=f"No {file_type} files provided")

    for file in files:
        content_type = get_content_type(file)

        if file_type in ["questions", "answers", "combined"]:
            # Accept images and PDFs for question/answer documents
            if content_type not in ALLOWED_DOCUMENT_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type for {file_type}: {content_type}. "
                           f"Allowed: images (PNG, JPG, GIF, WebP) and PDF"
                )
        elif file_type == "rubric":
            # Rubrics can also be text files
            if content_type not in ALLOWED_RUBRIC_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type for rubric: {content_type}. "
                           f"Allowed: images, PDF, or text files"
                )


async def save_files(
    files: List[UploadFile],
    session_id: UUID,
    file_type: str
) -> Path:
    """Save uploaded files to session directory."""
    settings = get_settings()
    session_dir = settings.upload_dir / str(session_id) / file_type
    session_dir.mkdir(parents=True, exist_ok=True)

    for i, file in enumerate(files):
        ext = Path(file.filename).suffix if file.filename else ".bin"
        file_path = session_dir / f"{file_type}_{i:03d}{ext}"

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        logger.info(
            "file_saved",
            session_id=str(session_id),
            file_type=file_type,
            filename=file.filename,
            size=len(content),
            path=str(file_path)
        )

    return session_dir


@router.post("/upload/questions", response_model=UploadResponse)
async def upload_questions(
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Form(None),
):
    """
    Upload question paper files (images or PDFs).

    Accepts:
    - Image files: PNG, JPG, GIF, WebP
    - PDF files: Will be converted to images for OCR

    If session_id is not provided, a new session will be created.
    """
    validate_files(files, "questions")

    db = get_database()

    # Create or use existing session
    if session_id:
        sid = UUID(session_id)
        session = db.get_session(sid)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        sid = db.create_session()

    # Save files
    save_path = await save_files(files, sid, "questions")

    # Detect file types for logging
    file_types = [get_content_type(f) for f in files]
    has_pdf = any("pdf" in t for t in file_types)

    # Update session
    db.update_session(
        session_id=sid,
        status=ProcessingStatus.UPLOADING,
        questions_path=str(save_path),
        current_step="Questions uploaded"
    )

    logger.info(
        "questions_uploaded",
        session_id=str(sid),
        file_count=len(files),
        has_pdf=has_pdf
    )

    file_desc = "file(s)" if len(files) > 1 else "file"
    return UploadResponse(
        session_id=sid,
        file_type="questions",
        file_count=len(files),
        message=f"Successfully uploaded {len(files)} question paper {file_desc}"
    )


@router.post("/upload/answers", response_model=UploadResponse)
async def upload_answers(
    files: List[UploadFile] = File(...),
    session_id: str = Form(...),
):
    """
    Upload answer sheet files (images or PDFs).

    Accepts:
    - Image files: PNG, JPG, GIF, WebP
    - PDF files: Will be converted to images for OCR

    Requires an existing session_id from a previous questions upload.
    """
    validate_files(files, "answers")

    db = get_database()
    sid = UUID(session_id)

    session = db.get_session(sid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save files
    save_path = await save_files(files, sid, "answers")

    # Detect file types
    file_types = [get_content_type(f) for f in files]
    has_pdf = any("pdf" in t for t in file_types)

    # Update session
    db.update_session(
        session_id=sid,
        answers_path=str(save_path),
        current_step="Answers uploaded"
    )

    logger.info(
        "answers_uploaded",
        session_id=str(sid),
        file_count=len(files),
        has_pdf=has_pdf
    )

    file_desc = "file(s)" if len(files) > 1 else "file"
    return UploadResponse(
        session_id=sid,
        file_type="answers",
        file_count=len(files),
        message=f"Successfully uploaded {len(files)} answer sheet {file_desc}"
    )


@router.post("/upload/combined", response_model=UploadResponse)
async def upload_combined(
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Form(None),
):
    """
    Upload combined documents containing BOTH questions AND answers.

    Use this endpoint when your document has:
    - Questions printed with answers written below them
    - A single PDF with question paper followed by answer sheets
    - Worksheets where questions and answers are on the same pages

    The OCR will automatically extract both questions and answers from
    the combined document.

    Accepts:
    - Image files: PNG, JPG, GIF, WebP
    - PDF files: Will be converted to images for OCR

    If session_id is not provided, a new session will be created.
    """
    validate_files(files, "combined")

    db = get_database()

    # Create or use existing session
    if session_id:
        sid = UUID(session_id)
        session = db.get_session(sid)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        sid = db.create_session()

    # Save files to a "combined" directory
    save_path = await save_files(files, sid, "combined")

    # Also set both questions and answers path to combined for the grading service
    db.update_session(
        session_id=sid,
        status=ProcessingStatus.UPLOADING,
        questions_path=str(save_path),
        answers_path=str(save_path),
        current_step="Combined document uploaded"
    )

    logger.info(
        "combined_uploaded",
        session_id=str(sid),
        file_count=len(files)
    )

    file_desc = "file(s)" if len(files) > 1 else "file"
    return UploadResponse(
        session_id=sid,
        file_type="combined",
        file_count=len(files),
        message=f"Successfully uploaded {len(files)} combined {file_desc}. "
                "Questions and answers will be extracted together."
    )


@router.post("/upload/rubric", response_model=UploadResponse)
async def upload_rubric(
    files: List[UploadFile] = File(...),
    session_id: str = Form(...),
):
    """
    Upload rubric files.

    Accepts:
    - Text files: TXT, MD, JSON (with grading criteria)
    - Image files: PNG, JPG, etc. (photos of rubric/marking scheme)
    - PDF files: Rubric documents

    Requires an existing session_id.
    """
    validate_files(files, "rubric")

    db = get_database()
    sid = UUID(session_id)

    session = db.get_session(sid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save files
    save_path = await save_files(files, sid, "rubric")

    # Detect file types
    file_types = [get_content_type(f) for f in files]
    has_text = any(t in ALLOWED_TEXT_TYPES for t in file_types)
    has_pdf = any("pdf" in t for t in file_types)
    has_images = any(t in ALLOWED_IMAGE_TYPES for t in file_types)

    # Update session
    db.update_session(
        session_id=sid,
        rubric_path=str(save_path),
        current_step="Rubric uploaded"
    )

    logger.info(
        "rubric_uploaded",
        session_id=str(sid),
        file_count=len(files),
        has_text=has_text,
        has_pdf=has_pdf,
        has_images=has_images
    )

    file_desc = "file(s)" if len(files) > 1 else "file"
    return UploadResponse(
        session_id=sid,
        file_type="rubric",
        file_count=len(files),
        message=f"Successfully uploaded {len(files)} rubric {file_desc}"
    )
