"""File upload endpoints for Gr8r."""

import shutil
from pathlib import Path
from typing import List
from uuid import UUID

import structlog
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ...config import get_settings
from ...models.database import get_database
from ...models.schemas import ProcessingStatus, UploadResponse

router = APIRouter()
logger = structlog.get_logger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES = {"application/pdf", "text/plain"}


def validate_files(files: List[UploadFile], file_type: str) -> None:
    """Validate uploaded files."""
    if not files:
        raise HTTPException(status_code=400, detail=f"No {file_type} files provided")

    for file in files:
        if file_type in ["questions", "answers"]:
            if file.content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type for {file_type}: {file.content_type}. "
                           f"Allowed: {ALLOWED_IMAGE_TYPES}"
                )
        elif file_type == "rubric":
            allowed = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES
            if file.content_type not in allowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type for rubric: {file.content_type}. "
                           f"Allowed: {allowed}"
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
            path=str(file_path)
        )

    return session_dir


@router.post("/upload/questions", response_model=UploadResponse)
async def upload_questions(
    files: List[UploadFile] = File(...),
    session_id: str = Form(None),
):
    """
    Upload question paper images.

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
        file_count=len(files)
    )

    return UploadResponse(
        session_id=sid,
        file_type="questions",
        file_count=len(files),
        message=f"Successfully uploaded {len(files)} question paper image(s)"
    )


@router.post("/upload/answers", response_model=UploadResponse)
async def upload_answers(
    files: List[UploadFile] = File(...),
    session_id: str = Form(...),
):
    """
    Upload answer sheet images.

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

    # Update session
    db.update_session(
        session_id=sid,
        answers_path=str(save_path),
        current_step="Answers uploaded"
    )

    logger.info(
        "answers_uploaded",
        session_id=str(sid),
        file_count=len(files)
    )

    return UploadResponse(
        session_id=sid,
        file_type="answers",
        file_count=len(files),
        message=f"Successfully uploaded {len(files)} answer sheet image(s)"
    )


@router.post("/upload/rubric", response_model=UploadResponse)
async def upload_rubric(
    files: List[UploadFile] = File(...),
    session_id: str = Form(...),
):
    """
    Upload rubric files (text or images with sample answers).

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

    # Update session
    db.update_session(
        session_id=sid,
        rubric_path=str(save_path),
        current_step="Rubric uploaded"
    )

    logger.info(
        "rubric_uploaded",
        session_id=str(sid),
        file_count=len(files)
    )

    return UploadResponse(
        session_id=sid,
        file_type="rubric",
        file_count=len(files),
        message=f"Successfully uploaded {len(files)} rubric file(s)"
    )
