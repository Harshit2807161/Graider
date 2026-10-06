"""Generate documents in every supported format, in code (no binary fixtures except one HEIC).

The same small answer sheet is rendered as a typed PDF, a scanned PDF, a mixed PDF, Word, ODT, RTF,
plain text and images of each kind, so tests can check every format end to end.
"""

import io
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FIXTURES = Path(__file__).parent / "fixtures"
HEIC_PHOTO = FIXTURES / "answer_photo.heic"  # made with macOS `sips -s format heic`; 600x400

ANSWER_LINES = ["Ans 1)  2x + 5 = 15, so 2x = 10 and x = 5", "Ans 2)  Plants take in carbon dioxide."]


def page_image(lines: list[str] = ANSWER_LINES, size: tuple[int, int] = (1240, 1754)) -> Image.Image:
    """An A4-proportioned white page with dark text (stands in for a scanned or photographed sheet)."""
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=40)
    for i, line in enumerate(lines):
        draw.text((90, 120 + i * 90), line, fill=(20, 20, 60), font=font)
    return image


def image_bytes(fmt: str, image: Image.Image | None = None, **save_kwargs) -> bytes:
    buffer = io.BytesIO()
    (image or page_image()).save(buffer, format=fmt, **save_kwargs)
    return buffer.getvalue()


def rotated_jpeg_with_exif() -> bytes:
    """A camera JPEG stored sideways with EXIF orientation 6 ("rotate 90° clockwise to view")."""
    upright = page_image(size=(600, 900))
    stored = upright.transpose(Image.Transpose.ROTATE_90)  # what the sensor wrote: 900 x 600
    exif = Image.Exif()
    exif[0x0112] = 6
    return image_bytes("JPEG", stored, exif=exif.tobytes(), quality=90)


def multipage_tiff(pages: int = 3) -> bytes:
    frames = [page_image([f"Page {i + 1}"], size=(600, 850)) for i in range(pages)]
    buffer = io.BytesIO()
    frames[0].save(buffer, format="TIFF", save_all=True, append_images=frames[1:])
    return buffer.getvalue()


def animated_gif() -> bytes:
    frames = [page_image(["first frame"], size=(400, 300)), page_image(["second frame"], size=(400, 300))]
    buffer = io.BytesIO()
    frames[0].save(buffer, format="GIF", save_all=True, append_images=frames[1:], duration=100)
    return buffer.getvalue()


def photo_of_page() -> bytes:
    """A phone photo: the page tilted in perspective on a dark desk."""
    import numpy as np
    import cv2

    page = np.array(page_image(size=(620, 877)))
    h, w = page.shape[:2]
    canvas_w, canvas_h = 1000, 1200
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[180, 140], [820, 200], [860, 1080], [120, 1030]])
    matrix = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(page, matrix, (canvas_w, canvas_h), borderValue=(40, 35, 30))
    return image_bytes("JPEG", Image.fromarray(warped), quality=92)


def typed_pdf(pages: list[list[str]] | None = None) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    for lines in pages or [ANSWER_LINES]:
        for i, line in enumerate(lines):
            pdf.drawString(72, 760 - i * 24, line)
        pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def scanned_pdf(pages: int = 2) -> bytes:
    """Image-only PDF, like a scanner makes."""
    images = [page_image([f"Scanned page {i + 1}", *ANSWER_LINES]) for i in range(pages)]
    buffer = io.BytesIO()
    images[0].save(buffer, format="PDF", save_all=True, append_images=images[1:], resolution=150)
    return buffer.getvalue()


def mixed_pdf() -> bytes:
    """Page 1 typed; page 2 a typed question with a photo of handwriting pasted under it."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.drawString(72, 760, "Q1. Solve 2x + 5 = 15. Show your working.")
    pdf.drawString(72, 736, "Q2. Which gas do plants take in for photosynthesis?")
    pdf.showPage()
    pdf.drawString(72, 790, "Q3. Explain why the Moon has phases.")
    photo = ImageReader(page_image(["The Moon is lit by the Sun"], size=(1000, 900)))
    pdf.drawImage(photo, 40, 60, width=515, height=700)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def encrypted_pdf(password: str = "secret") -> bytes:
    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter()
    for page in PdfReader(io.BytesIO(typed_pdf())).pages:
        writer.add_page(page)
    writer.encrypt(user_password=password, owner_password=password + "-owner")
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def owner_locked_pdf() -> bytes:
    """Encrypted with an empty user password (opens without asking; common for 'protected' PDFs)."""
    return encrypted_pdf(password="")


def docx(lines: list[str] = ANSWER_LINES, *, table: bool = True) -> bytes:
    from docx import Document

    document = Document()
    document.add_heading("Answers", level=1)
    for line in lines:
        document.add_paragraph(line)
    if table:
        grid = document.add_table(rows=2, cols=2)
        grid.cell(0, 0).text, grid.cell(0, 1).text = "Question", "Answer"
        grid.cell(1, 0).text, grid.cell(1, 1).text = "3", "Oxygen"
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def with_zip_member(data: bytes, name: str, content: bytes) -> bytes:
    source = zipfile.ZipFile(io.BytesIO(data))
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as target:
        for item in source.infolist():
            target.writestr(item, source.read(item.filename))
        target.writestr(name, content)
    return buffer.getvalue()


def macro_docx() -> bytes:
    return with_zip_member(docx(), "word/vbaProject.bin", b"\x00" * 64)


def odt() -> bytes:
    """A minimal OpenDocument text file (valid enough to identify; conversion tests use real DOCX)."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(zipfile.ZipInfo("mimetype"), "application/vnd.oasis.opendocument.text")
        archive.writestr("content.xml", "<office:document-content/>")
    return buffer.getvalue()


def pptx_like() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.'
            'presentationml.presentation.main+xml"/></Types>',
        )
    return buffer.getvalue()


def zip_bomb(uncompressed_mb: int = 40) -> bytes:
    """A DOCX-shaped ZIP whose one member inflates enormously."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", b"\x00" * (uncompressed_mb * 1024 * 1024))
    return buffer.getvalue()


def rtf() -> bytes:
    return b"{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times;}} Ans 1) x = 5\\par Ans 2) carbon dioxide\\par}"


def text(lines: list[str] = ANSWER_LINES) -> bytes:
    return "\n".join(lines).encode()
