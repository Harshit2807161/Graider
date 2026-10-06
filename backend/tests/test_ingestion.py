"""Document intake: every supported format is recognised, converted into pages, and bad files are refused."""

import re

import pytest

from app.ingestion.formats import DOCUMENT_KINDS, FileKind, UnsupportedFile, detect
from tests import ingestion_fixtures as fx


# ===== recognising files =====

@pytest.mark.parametrize(
    "name, make, kind",
    [
        ("answers.pdf", fx.typed_pdf, FileKind.PDF),
        ("scan.pdf", fx.scanned_pdf, FileKind.PDF),
        ("answers.docx", fx.docx, FileKind.DOCX),
        ("answers.odt", fx.odt, FileKind.ODT),
        ("answers.rtf", fx.rtf, FileKind.RTF),
        ("slides.pptx", fx.pptx_like, FileKind.PPTX),
        ("answers.txt", fx.text, FileKind.TXT),
        ("answers.md", fx.text, FileKind.MARKDOWN),
        ("photo.jpg", lambda: fx.image_bytes("JPEG"), FileKind.JPEG),
        ("photo.jpeg", fx.rotated_jpeg_with_exif, FileKind.JPEG),
        ("page.png", lambda: fx.image_bytes("PNG"), FileKind.PNG),
        ("page.webp", lambda: fx.image_bytes("WEBP"), FileKind.WEBP),
        ("IMG_0001.HEIC", lambda: fx.HEIC_PHOTO.read_bytes(), FileKind.HEIC),
        ("scan.tiff", fx.multipage_tiff, FileKind.TIFF),
        ("page.gif", fx.animated_gif, FileKind.GIF),
        ("page.bmp", lambda: fx.image_bytes("BMP"), FileKind.BMP),
    ],
)
def test_every_supported_format_is_recognised(name, make, kind):
    assert detect(make(), name, DOCUMENT_KINDS) == kind


def test_legacy_doc_is_recognised_by_its_container():
    ole_header = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 504
    assert detect(ole_header, "old.doc", DOCUMENT_KINDS) == FileKind.DOC


def test_mislabelled_image_is_accepted_as_what_it_really_is():
    # Phones and browsers often save PNG or HEIC data with a .jpg name
    assert detect(fx.image_bytes("PNG"), "photo.jpg", DOCUMENT_KINDS) == FileKind.PNG
    assert detect(fx.HEIC_PHOTO.read_bytes(), "photo.jpg", DOCUMENT_KINDS) == FileKind.HEIC


@pytest.mark.parametrize(
    "name, make, message",
    [
        ("answers.exe", lambda: b"MZ\x90\x00", "Unsupported file type '.exe'"),
        ("answers", fx.typed_pdf, "Unsupported file type"),
        ("answers.xlsx", lambda: b"irrelevant", "Unsupported file type '.xlsx'"),  # not for answers
        ("answers.pdf", lambda: fx.image_bytes("PNG"), "contents (png) don't match its extension (.pdf)"),
        ("answers.docx", fx.typed_pdf, "contents (pdf) don't match its extension (.docx)"),
        ("answers.png", lambda: b"\x00\x01\x02\x03" * 100, "don't match any supported format"),
        ("answers.pdf", lambda: b"", "empty"),
        ("answers.docx", fx.macro_docx, "macros are not accepted"),
        ("answers.docx", lambda: fx.zip_bomb(40), "possible zip bomb"),
        ("answers.docx", lambda: b"PK\x03\x04 truncated", "damaged"),
    ],
)
def test_bad_files_are_refused_with_a_clear_reason(name, make, message):
    with pytest.raises(UnsupportedFile, match=re.escape(message)):
        detect(make(), name, DOCUMENT_KINDS)


def test_oversized_files_are_refused(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 1)
    with pytest.raises(UnsupportedFile, match="exceeds the 1 MB limit"):
        detect(b"%PDF-1.7" + b"\x00" * (2 * 1024 * 1024), "big.pdf", DOCUMENT_KINDS)
