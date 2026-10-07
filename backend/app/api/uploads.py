"""Checks shared by every file upload endpoint (answer sheets, exam documents)."""

from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.ingestion.formats import DOCUMENT_KINDS, OFFICE_KINDS, FileKind, UnsupportedFile, detect
from app.ingestion.office import converter_available
from app.ingestion.pages import DocumentError, open_pdf


async def validated(upload: UploadFile) -> tuple[str, bytes, FileKind]:
    """Read and check one uploaded document. Never trusts the client's file name or type."""
    name = upload.filename or "upload"
    data = await upload.read()
    if len(data) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"{name}: file exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit")
    try:
        kind = detect(data, name, DOCUMENT_KINDS)
        if kind in OFFICE_KINDS and not converter_available():
            raise UnsupportedFile("Word/office documents can't be converted on this server. Upload a PDF instead.")
        if kind == FileKind.PDF:
            open_pdf(data).close()  # password-protected, damaged or too long: say so now, not later
    except (UnsupportedFile, DocumentError) as e:
        raise HTTPException(status_code=400, detail=f"{name}: {e}")
    return name, data, kind
