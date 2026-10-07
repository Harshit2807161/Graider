"""What kind of file is this, and is it safe to process? (Never trust names or browser types.)

The extension must be on the allowlist and the file's own bytes must agree with it. Office files
are ZIP or OLE containers: ZIPs are inspected for size bombs and macros before anything opens them.
"""

import io
import zipfile
from enum import Enum

import filetype

from app.core.config import settings


class FileKind(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    DOC = "doc"
    ODT = "odt"
    RTF = "rtf"
    PPTX = "pptx"
    XLSX = "xlsx"
    XLS = "xls"
    CSV = "csv"
    TXT = "txt"
    MARKDOWN = "md"
    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"
    HEIC = "heic"
    TIFF = "tiff"
    GIF = "gif"
    BMP = "bmp"


IMAGE_KINDS = {FileKind.JPEG, FileKind.PNG, FileKind.WEBP, FileKind.HEIC, FileKind.TIFF, FileKind.GIF, FileKind.BMP}
OFFICE_KINDS = {FileKind.DOCX, FileKind.DOC, FileKind.ODT, FileKind.RTF, FileKind.PPTX}
TEXT_KINDS = {FileKind.TXT, FileKind.MARKDOWN}
SPREADSHEET_KINDS = {FileKind.XLSX, FileKind.XLS, FileKind.CSV}
# Anything that can hold a student's answers
DOCUMENT_KINDS = {FileKind.PDF} | OFFICE_KINDS | IMAGE_KINDS | TEXT_KINDS

EXTENSIONS: dict[str, FileKind] = {
    ".pdf": FileKind.PDF,
    ".docx": FileKind.DOCX, ".doc": FileKind.DOC, ".odt": FileKind.ODT, ".rtf": FileKind.RTF,
    ".pptx": FileKind.PPTX,
    ".xlsx": FileKind.XLSX, ".xls": FileKind.XLS, ".csv": FileKind.CSV,
    ".txt": FileKind.TXT, ".md": FileKind.MARKDOWN, ".markdown": FileKind.MARKDOWN,
    ".jpg": FileKind.JPEG, ".jpeg": FileKind.JPEG, ".png": FileKind.PNG, ".webp": FileKind.WEBP,
    ".heic": FileKind.HEIC, ".heif": FileKind.HEIC, ".tif": FileKind.TIFF, ".tiff": FileKind.TIFF,
    ".gif": FileKind.GIF, ".bmp": FileKind.BMP,
}

_IMAGE_MIMES = {
    "image/jpeg": FileKind.JPEG, "image/png": FileKind.PNG, "image/webp": FileKind.WEBP,
    "image/heic": FileKind.HEIC, "image/heif": FileKind.HEIC, "image/tiff": FileKind.TIFF,
    "image/gif": FileKind.GIF, "image/bmp": FileKind.BMP,
}

# ZIP containers (DOCX/PPTX/XLSX/ODT): refuse bombs before any parser sees them
MAX_ZIP_ENTRIES = 5000
MAX_ZIP_UNCOMPRESSED = 300 * 1024 * 1024
MAX_ZIP_RATIO = 200  # uncompressed / compressed, per entry

_OOXML_MAIN = {
    "wordprocessingml.document.main": FileKind.DOCX,
    "presentationml.presentation.main": FileKind.PPTX,
    "spreadsheetml.sheet.main": FileKind.XLSX,
}
_ODF_MIMETYPES = {"application/vnd.oasis.opendocument.text": FileKind.ODT}


class UnsupportedFile(ValueError):
    """The upload can't be accepted; the message is safe to show to the user."""


def _family(kind: FileKind) -> str:
    for name, kinds in (("image", IMAGE_KINDS), ("office", OFFICE_KINDS), ("text", TEXT_KINDS),
                        ("spreadsheet", SPREADSHEET_KINDS)):
        if kind in kinds:
            return name
    return kind.value


def _inspect_zip(data: bytes) -> FileKind:
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise UnsupportedFile("The file is damaged (not a valid document).")
    entries = archive.infolist()
    if len(entries) > MAX_ZIP_ENTRIES:
        raise UnsupportedFile("The document has too many parts to process safely.")
    total = 0
    for entry in entries:
        total += entry.file_size
        if entry.file_size > 1024 * 1024 and entry.file_size > MAX_ZIP_RATIO * max(entry.compress_size, 1):
            raise UnsupportedFile("The document is compressed suspiciously (possible zip bomb).")
    if total > MAX_ZIP_UNCOMPRESSED:
        raise UnsupportedFile("The document is too large once unpacked.")

    names = {e.filename for e in entries}
    if any(n.lower().endswith("vbaproject.bin") for n in names):
        raise UnsupportedFile("Documents with macros are not accepted. Save it as a regular .docx/.pptx first.")
    if "mimetype" in names:
        mimetype = archive.read("mimetype").decode("ascii", "replace").strip()
        if mimetype in _ODF_MIMETYPES:
            return _ODF_MIMETYPES[mimetype]
    if "[Content_Types].xml" in names:
        content_types = archive.read("[Content_Types].xml").decode("utf-8", "replace")
        if "macroEnabled" in content_types:
            raise UnsupportedFile("Documents with macros are not accepted. Save it as a regular .docx/.pptx first.")
        for marker, kind in _OOXML_MAIN.items():
            if marker in content_types:
                return kind
    raise UnsupportedFile("Unrecognised document (a ZIP file that isn't Word, PowerPoint, Excel or ODT).")


def _is_text(data: bytes) -> bool:
    if b"\x00" in data[:8192]:
        return False
    try:
        data.decode("utf-8-sig")
        return True
    except UnicodeDecodeError:
        return False


def sniff(data: bytes) -> FileKind | None:
    """The kind the bytes themselves say, or None if they say nothing we accept."""
    head = data[:1024]
    if b"%PDF-" in head:
        return FileKind.PDF
    if data.startswith(b"PK\x03\x04"):
        return _inspect_zip(data)
    if data.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):  # OLE2: legacy .doc / .xls / .ppt
        return FileKind.DOC
    if data.lstrip()[:5] == b"{\\rtf":
        return FileKind.RTF
    guess = filetype.guess(data)
    if guess is not None and guess.mime in _IMAGE_MIMES:
        return _IMAGE_MIMES[guess.mime]
    if _is_text(data):
        return FileKind.TXT
    return None


def detect(data: bytes, filename: str, allowed: set[FileKind]) -> FileKind:
    """Validate an upload: allowed extension, matching content, within limits. Returns its kind."""
    if not data:
        raise UnsupportedFile("The file is empty.")
    if len(data) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise UnsupportedFile(f"The file exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit.")
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    claimed = EXTENSIONS.get(suffix)
    if claimed is None or claimed not in allowed:
        names = ", ".join(sorted(ext for ext, kind in EXTENSIONS.items() if kind in allowed))
        raise UnsupportedFile(f"Unsupported file type '{suffix or filename}'. Allowed: {names}")

    actual = sniff(data)
    if actual is None:
        raise UnsupportedFile("The file's contents don't match any supported format.")
    if claimed == FileKind.XLS and actual == FileKind.DOC:  # both are OLE2 containers
        actual = FileKind.XLS
    if actual == FileKind.TXT and claimed in (TEXT_KINDS | {FileKind.CSV}):
        actual = claimed
    if actual == claimed:
        return actual
    # Phones and browsers mislabel images (a .jpg that is really PNG/HEIC): trust the bytes
    if _family(actual) == _family(claimed) == "image" and actual in allowed:
        return actual
    raise UnsupportedFile(
        f"The file's contents ({actual.value}) don't match its extension ({suffix}). Re-save or rename it."
    )
