"""Office documents (DOCX, DOC, ODT, RTF, PPTX) -> PDF, via the sandboxed Gotenberg converter.

Untrusted office files are never opened in the worker: LibreOffice runs in its own container
(no internet access, non-root, restarted regularly, time-limited). See docker-compose.yml.
"""

import time

import httpx
import structlog

from app.core.config import settings
from app.ingestion.pages import DocumentError

logger = structlog.get_logger(__name__)

# Gotenberg's first LibreOffice start can time out on a machine low on memory; a retry then works.
RETRY_DELAY_S = 1.5


def converter_available() -> bool:
    return bool(settings.GOTENBERG_URL)


def convert_to_pdf(data: bytes, filename: str) -> bytes:
    """Return the document as PDF bytes. Raises DocumentError with a user-safe message."""
    if not settings.GOTENBERG_URL:
        raise DocumentError("Word/office documents can't be converted on this server. Upload a PDF instead.")
    url = settings.GOTENBERG_URL.rstrip("/") + "/forms/libreoffice/convert"
    response = None
    for attempt in (1, 2):
        try:
            response = httpx.post(url, files={"files": (filename, data)}, timeout=settings.GOTENBERG_TIMEOUT_S)
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            if attempt == 1:
                logger.warning("converter_retry", reason=type(e).__name__)
                time.sleep(RETRY_DELAY_S)
                continue
            raise DocumentError(f"The document converter is unavailable ({type(e).__name__}). Try again later.")
        except httpx.HTTPError as e:
            raise DocumentError(f"The document converter is unavailable ({type(e).__name__}). Try again later.")
        if response.status_code == 503 and attempt == 1:
            logger.warning("converter_retry", reason="http_503")
            time.sleep(RETRY_DELAY_S)
            continue
        break
    if response.status_code == 503:
        raise DocumentError("Converting the document took too long. Try a smaller file or a PDF.")
    # LibreOffice reports unreadable documents as 400 or 500 (seen in Gotenberg 8.37)
    if response.status_code != 200 or not response.content.startswith(b"%PDF-"):
        raise DocumentError(
            "The document couldn't be converted (it may be damaged or use features the converter "
            f"can't read; HTTP {response.status_code}). Try saving it as PDF."
        )
    return response.content
