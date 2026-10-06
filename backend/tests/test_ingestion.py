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


# ===== turning documents into pages =====

from app.core.config import settings  # noqa: E402
from app.ingestion.pages import DocumentError, PageKind, render_image, render_pdf, render_text  # noqa: E402


def write(tmp_path, name, data):
    path = tmp_path / name
    path.write_bytes(data)
    return path


def test_typed_pdf_keeps_its_text_layer_and_renders_at_200_dpi():
    (page,) = list(render_pdf(fx.typed_pdf()))
    assert page.kind == PageKind.DIGITAL and "x = 5" in page.text and page.dpi == 200
    assert page.image.size == (1654, 2339)  # A4 at 200 DPI, under the 2576 px cap


def test_scanned_pdf_has_images_only():
    pages = list(render_pdf(fx.scanned_pdf(pages=2)))
    assert [p.kind for p in pages] == [PageKind.SCANNED, PageKind.SCANNED] and all(p.text is None for p in pages)


def test_mixed_pdf_is_judged_page_by_page():
    typed, with_photo = render_pdf(fx.mixed_pdf())
    assert typed.kind == PageKind.DIGITAL and typed.text.startswith("Q1. Solve 2x + 5 = 15")
    # Typed question + pasted photo of handwriting: keep the typed text, but the image is what matters
    assert with_photo.kind == PageKind.MIXED and with_photo.text == "Q3. Explain why the Moon has phases."


def test_long_edge_is_capped(monkeypatch):
    monkeypatch.setattr(settings, "INGEST_MAX_LONG_EDGE", 1000)
    (page,) = list(render_pdf(fx.typed_pdf()))
    assert max(page.image.size) == 1000


def test_password_protected_pdf_is_refused_but_owner_locked_opens():
    with pytest.raises(DocumentError, match="password-protected"):
        list(render_pdf(fx.encrypted_pdf()))
    assert len(list(render_pdf(fx.owner_locked_pdf()))) == 1


def test_pdf_page_limit(monkeypatch):
    monkeypatch.setattr(settings, "MAX_PAGES_PER_DOCUMENT", 2)
    with pytest.raises(DocumentError, match="has 3 pages; the limit is 2"):
        list(render_pdf(fx.typed_pdf([["a"], ["b"], ["c"]])))


def test_damaged_pdf_is_refused():
    with pytest.raises(DocumentError, match="damaged"):
        list(render_pdf(b"%PDF-1.7\nnot really a pdf"))


@pytest.mark.parametrize(
    "name, make, kind, pages",
    [
        ("page.png", lambda: fx.image_bytes("PNG"), FileKind.PNG, 1),
        ("page.webp", lambda: fx.image_bytes("WEBP"), FileKind.WEBP, 1),
        ("page.bmp", lambda: fx.image_bytes("BMP"), FileKind.BMP, 1),
        ("IMG.HEIC", lambda: fx.HEIC_PHOTO.read_bytes(), FileKind.HEIC, 1),
        ("scan.tiff", fx.multipage_tiff, FileKind.TIFF, 3),
        ("page.gif", fx.animated_gif, FileKind.GIF, 1),  # first frame only
    ],
)
def test_images_become_rgb_pages(tmp_path, name, make, kind, pages):
    rendered = list(render_image(write(tmp_path, name, make()), kind))
    assert len(rendered) == pages and all(p.image.mode == "RGB" and p.kind == PageKind.PHOTO for p in rendered)


def test_camera_rotation_is_applied(tmp_path):
    (page,) = list(render_image(write(tmp_path, "photo.jpg", fx.rotated_jpeg_with_exif()), FileKind.JPEG))
    assert page.image.height > page.image.width  # stored 900x600 sideways, viewed upright 600x900


def test_photo_of_a_page_is_straightened(tmp_path):
    (page,) = list(render_image(write(tmp_path, "photo.jpg", fx.photo_of_page()), FileKind.JPEG))
    width, height = page.image.size
    assert width < 1000 and height < 1200  # cropped to the page (the photo was 1000x1200 with a desk)
    gray = page.image.convert("L")
    border = [gray.getpixel((x, y)) for x, y in ((5, 5), (width - 5, 5), (5, height - 5), (width - 5, height - 5))]
    assert min(border) > 180  # the corners are paper, not desk
    dark = sum(1 for value in gray.getdata() if value < 80) / (width * height)
    assert dark < 0.02  # almost no desk left (dark pixels are only the writing)


def test_clean_scan_is_left_as_it_is(tmp_path):
    original = fx.page_image()
    (page,) = list(render_image(write(tmp_path, "scan.png", fx.image_bytes("PNG", original)), FileKind.PNG))
    assert page.image.size == original.size


def test_oversized_image_is_refused(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "MAX_IMAGE_PIXELS", 1000)
    with pytest.raises(DocumentError, match="too large"):
        list(render_image(write(tmp_path, "page.png", fx.image_bytes("PNG")), FileKind.PNG))


def test_text_file_is_one_text_page(tmp_path):
    (page,) = list(render_text(write(tmp_path, "answers.txt", fx.text())))
    assert page.kind == PageKind.TEXT and page.image is None and page.text.startswith("Ans 1)")


# ===== storing documents and making pages =====

from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.ingestion import service  # noqa: E402
from app.models.document import DocumentRole, DocumentStatus  # noqa: E402
from app.models.exam import Submission  # noqa: E402


@pytest.fixture
def uploads(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", tmp_path)
    return tmp_path


def stored(db, school, name, data, *, submission=None, position=0):
    kind = detect(data, name, DOCUMENT_KINDS)
    document = service.store_upload(
        db, data=data, filename=name, kind=kind, org_id=school["org"].id, exam_id=school["exam"].id,
        role=DocumentRole.ANSWERS, submission_id=submission.id if submission else None, position=position,
    )
    db.commit()
    db.refresh(document)
    return document


@pytest.mark.parametrize(
    "name, make, kinds",
    [
        ("typed.pdf", fx.typed_pdf, ["digital"]),
        ("scan.pdf", lambda: fx.scanned_pdf(pages=2), ["scanned", "scanned"]),
        ("mixed.pdf", fx.mixed_pdf, ["digital", "mixed"]),
        ("IMG_1.HEIC", lambda: fx.HEIC_PHOTO.read_bytes(), ["photo"]),
        ("scan.tiff", fx.multipage_tiff, ["photo", "photo", "photo"]),
        ("answers.txt", fx.text, ["text"]),
    ],
)
def test_documents_become_stored_pages(db, school, uploads, name, make, kinds):
    document = stored(db, school, name, make())

    pages = service.ensure_pages(db, document)

    assert [p.kind for p in pages] == kinds and document.status == DocumentStatus.READY
    assert document.page_count == len(kinds) and document.original_filename == name
    assert str(uploads) in document.stored_path and name not in document.stored_path  # generated name
    for page in pages:
        if page.kind == "text":
            assert page.image_path is None and page.text_layer
        else:
            assert page.image_path.endswith(".jpg") and page.image_sha256 and page.width and page.height


def test_pages_are_made_once(db, school, uploads, monkeypatch):
    document = stored(db, school, "typed.pdf", fx.typed_pdf())
    first = service.ensure_pages(db, document)
    monkeypatch.setattr(service, "_render", lambda d: pytest.fail("pages were rendered again"))

    assert [p.id for p in service.ensure_pages(db, document)] == [p.id for p in first]


def test_unreadable_document_is_marked_failed_with_the_reason(db, school, uploads):
    document = stored(db, school, "locked.pdf", fx.encrypted_pdf())

    with pytest.raises(DocumentError, match="password-protected"):
        service.ensure_pages(db, document)

    assert document.status == DocumentStatus.FAILED and "password-protected" in document.error


def test_office_documents_need_the_converter(db, school, uploads, monkeypatch):
    monkeypatch.setattr(settings, "GOTENBERG_URL", None)
    document = stored(db, school, "answers.docx", fx.docx())

    with pytest.raises(DocumentError, match="can't be converted on this server"):
        service.ensure_pages(db, document)


def test_office_documents_are_converted_then_rendered(db, school, uploads, monkeypatch):
    sent = []

    def fake_convert(data, filename):
        sent.append(filename)
        return fx.typed_pdf([["Converted from Word: x = 5"]])

    monkeypatch.setattr(service, "convert_to_pdf", fake_convert)
    document = stored(db, school, "Answers (final).docx", fx.docx())

    (page,) = service.ensure_pages(db, document)

    assert sent == ["document.docx"]  # the user's file name never reaches the converter
    assert page.kind == "digital" and "x = 5" in page.text_layer


def test_submission_pages_follow_upload_order(db, school, uploads):
    submission = Submission(exam_id=school["exam"].id, original_file_url="(documents)")
    db.add(submission)
    db.commit()
    stored(db, school, "page2.png", fx.image_bytes("PNG"), submission=submission, position=1)
    stored(db, school, "page1.pdf", fx.typed_pdf(), submission=submission, position=0)

    pages = service.submission_pages(db, submission)

    assert [p.kind for p in pages] == ["digital", "photo"]


def test_submission_page_cap(db, school, uploads, monkeypatch):
    monkeypatch.setattr(settings, "MAX_PAGES_PER_SUBMISSION", 2)
    submission = Submission(exam_id=school["exam"].id, original_file_url="(documents)")
    db.add(submission)
    db.commit()
    stored(db, school, "scan.tiff", fx.multipage_tiff(3), submission=submission)

    with pytest.raises(DocumentError, match="has 3 pages; the limit is 2"):
        service.submission_pages(db, submission)


def test_submission_from_before_documents_is_adopted(db, school, uploads):
    sheet = uploads / "legacy_answer.png"
    sheet.write_bytes(fx.image_bytes("PNG"))
    submission = Submission(exam_id=school["exam"].id, original_file_url=str(sheet))
    db.add(submission)
    db.commit()

    (document,) = service.submission_documents(db, submission)
    (page,) = service.submission_pages(db, submission)

    assert document.kind == "png" and document.stored_path == str(sheet) and page.kind == "photo"
    with Session(engine) as fresh:
        assert len(service.submission_documents(fresh, fresh.get(Submission, submission.id))) == 1
