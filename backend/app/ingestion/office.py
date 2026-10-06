"""Office documents (DOCX, DOC, ODT, RTF, PPTX) -> PDF, via the sandboxed Gotenberg converter.

Untrusted office files are never opened in the worker: LibreOffice runs in its own container
(no internet access, non-root, restarted regularly, time-limited). See docker-compose.yml.
"""

import httpx

from app.core.config import settings
from app.ingestion.pages import DocumentError


def converter_available() -> bool:
    return bool(settings.GOTENBERG_URL)


def convert_to_pdf(data: bytes, filename: str) -> bytes:
    """Return the document as PDF bytes. Raises DocumentError with a user-safe message."""
    if not settings.GOTENBERG_URL:
        raise DocumentError("Word/office documents can't be converted on this server. Upload a PDF instead.")
    url = settings.GOTENBERG_URL.rstrip("/") + "/forms/libreoffice/convert"
    try:
        response = httpx.post(url, files={"files": (filename, data)}, timeout=settings.GOTENBERG_TIMEOUT_S)
    except httpx.HTTPError as e:
        raise DocumentError(f"The document converter is unavailable ({type(e).__name__}). Try again later.")
    if response.status_code == 400:
        raise DocumentError("The document is damaged or uses features the converter can't read.")
    if response.status_code == 503:
        raise DocumentError("Converting the document took too long. Try a smaller file or a PDF.")
    if response.status_code != 200 or not response.content.startswith(b"%PDF-"):
        raise DocumentError(f"The document converter failed (HTTP {response.status_code}).")
    return response.content
