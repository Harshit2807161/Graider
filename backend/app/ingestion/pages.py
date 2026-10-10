"""Turn a PDF, image or text file into normalised pages.

Every page is an upright RGB image, rendered or resized so its long edge is at most
INGEST_MAX_LONG_EDGE (and PDFs at INGEST_DPI), plus the PDF's text layer when the page was created
digitally. A scanner's own OCR layer is ignored: the vision model reads the image instead.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Optional

import numpy as np
import pi_heif
import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_c
from PIL import Image, ImageOps, ImageSequence

from app.core.config import settings
from app.ingestion.formats import FileKind

pi_heif.register_heif_opener()


class PageKind:
    DIGITAL = "digital"  # usable text layer, little imagery
    MIXED = "mixed"  # usable text layer and substantial imagery (e.g. typed question + pasted photo)
    SCANNED = "scanned"  # imagery only, or a scanner's OCR layer
    PHOTO = "photo"  # an image file
    TEXT = "text"  # a plain-text file (no image)


class DocumentError(ValueError):
    """The document can't be turned into pages; the message is safe to show to the user."""


@dataclass
class RenderedPage:
    image: Optional[Image.Image]
    text: Optional[str]
    kind: str
    dpi: Optional[int] = None


# ===== text layers =====

MIN_TEXT_CHARS = 20
MAX_JUNK_SHARE = 0.1  # unmappable glyphs: the text layer is garbage
SCAN_COVERAGE = 0.8  # images cover the page: a scan (any text is the scanner's OCR)
MIXED_COVERAGE = 0.15


def _junk_share(text: str) -> float:
    chars = [c for c in text if not c.isspace()]
    if not chars:
        return 0.0
    junk = sum(1 for c in chars if c == "�" or 0xE000 <= ord(c) <= 0xF8FF)
    return junk / len(chars)


def classify_page(text: str, image_coverage: float) -> tuple[str, Optional[str]]:
    """Decide what kind of page this is and whether its text layer can be trusted."""
    usable = len(text.strip()) >= MIN_TEXT_CHARS and _junk_share(text) < MAX_JUNK_SHARE
    if image_coverage >= SCAN_COVERAGE or (not usable and image_coverage > 0):
        return PageKind.SCANNED, None
    if not usable:
        return PageKind.DIGITAL, None  # vector drawings / stylus notes, or a blank page
    if image_coverage >= MIXED_COVERAGE:
        return PageKind.MIXED, text.strip()
    return PageKind.DIGITAL, text.strip()


# ===== PDF =====

def _image_coverage(page: pdfium.PdfPage, width: float, height: float) -> float:
    covered = 0.0
    for obj in page.get_objects(filter=[pdfium_c.FPDF_PAGEOBJ_IMAGE], max_depth=3):
        left, bottom, right, top = obj.get_bounds()
        w = max(0.0, min(right, width) - max(left, 0.0))
        h = max(0.0, min(top, height) - max(bottom, 0.0))
        covered += w * h
    return min(1.0, covered / (width * height)) if width and height else 0.0


def open_pdf(source: Path | bytes) -> pdfium.PdfDocument:
    try:
        pdf = pdfium.PdfDocument(source)
    except pdfium.PdfiumError as e:
        if "password" in str(e).lower():
            raise DocumentError("The PDF is password-protected. Please upload an unlocked copy.")
        raise DocumentError("The PDF is damaged and can't be opened.")
    if len(pdf) == 0:
        raise DocumentError("The PDF has no pages.")
    if len(pdf) > settings.MAX_PAGES_PER_DOCUMENT:
        raise DocumentError(f"The PDF has {len(pdf)} pages; the limit is {settings.MAX_PAGES_PER_DOCUMENT}.")
    return pdf


def render_pdf(source: Path | bytes) -> Iterator[RenderedPage]:
    pdf = open_pdf(source)
    try:
        for index in range(len(pdf)):
            page = pdf[index]
            width, height = page.get_size()
            scale = min(settings.INGEST_DPI / 72, settings.INGEST_MAX_LONG_EDGE / max(width, height, 1))
            image = page.render(scale=scale).to_pil().convert("RGB")
            textpage = page.get_textpage()
            kind, text = classify_page(textpage.get_text_bounded(), _image_coverage(page, width, height))
            textpage.close()
            page.close()
            yield RenderedPage(image=image, text=text, kind=kind, dpi=round(scale * 72))
    finally:
        pdf.close()


# ===== images =====

def _flatten(image: Image.Image) -> Image.Image:
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        background = Image.new("RGB", image.size, "white")
        background.paste(image.convert("RGBA"), mask=image.convert("RGBA").split()[-1])
        return background
    return image.convert("RGB")


def _order_corners(points: np.ndarray) -> np.ndarray:
    ordered = np.zeros((4, 2), dtype="float32")
    sums, diffs = points.sum(axis=1), np.diff(points, axis=1).ravel()
    ordered[0], ordered[2] = points[np.argmin(sums)], points[np.argmax(sums)]  # top-left, bottom-right
    ordered[1], ordered[3] = points[np.argmin(diffs)], points[np.argmax(diffs)]  # top-right, bottom-left
    return ordered


def straighten(image: Image.Image) -> Image.Image:
    """If the image is a photo of a page on a darker background, crop and flatten the page.
    Leaves the image unchanged when no clear four-cornered page outline is found."""
    import cv2

    rgb = np.array(image)
    height, width = rgb.shape[:2]
    scale = min(1.0, 800 / max(height, width))
    small = cv2.resize(rgb, (max(1, int(width * scale)), max(1, int(height * scale))))
    gray = cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_RGB2GRAY), (5, 5), 0)
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return image
    page = max(contours, key=cv2.contourArea)
    share = cv2.contourArea(page) / float(small.shape[0] * small.shape[1])
    if not 0.25 <= share <= 0.95:  # no page found, or the page already fills the frame
        return image
    outline = cv2.approxPolyDP(page, 0.02 * cv2.arcLength(page, True), True)
    if len(outline) != 4 or not cv2.isContourConvex(outline):
        return image

    corners = _order_corners(outline.reshape(4, 2).astype("float32") / scale)
    top_left, top_right, bottom_right, bottom_left = corners
    out_w = int(max(np.linalg.norm(top_right - top_left), np.linalg.norm(bottom_right - bottom_left)))
    out_h = int(max(np.linalg.norm(bottom_left - top_left), np.linalg.norm(bottom_right - top_right)))
    target = np.float32([[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]])
    warped = cv2.warpPerspective(rgb, cv2.getPerspectiveTransform(corners, target), (out_w, out_h))
    return Image.fromarray(warped)


def _normalise(image: Image.Image) -> Image.Image:
    image = straighten(_flatten(image))
    # Gentle, on brightness only: stretching each channel separately tints coloured ink on grey
    # (a whiteboard photo turned magenta). Never binarise (faint pencil).
    image = ImageOps.autocontrast(image, cutoff=0.5, preserve_tone=True)
    if max(image.size) > settings.INGEST_MAX_LONG_EDGE:
        image.thumbnail((settings.INGEST_MAX_LONG_EDGE, settings.INGEST_MAX_LONG_EDGE), Image.Resampling.LANCZOS)
    return image


def render_image(path: Path, kind: FileKind) -> Iterator[RenderedPage]:
    try:
        source = Image.open(path)
    except (OSError, Image.DecompressionBombError):
        raise DocumentError("The image is damaged or too large to open.")
    with source:
        if source.width * source.height > settings.MAX_IMAGE_PIXELS:
            raise DocumentError("The image is too large (too many pixels).")
        frames = ImageSequence.Iterator(source) if kind == FileKind.TIFF else [source]  # GIF: first frame
        for index, frame in enumerate(frames):
            if index >= settings.MAX_PAGES_PER_DOCUMENT:
                raise DocumentError(f"The image has more than {settings.MAX_PAGES_PER_DOCUMENT} pages.")
            upright = ImageOps.exif_transpose(frame.copy()) if index == 0 else frame.copy()
            yield RenderedPage(image=_normalise(upright), text=None, kind=PageKind.PHOTO)


# ===== text =====

def render_text(path: Path) -> Iterator[RenderedPage]:
    text = path.read_bytes().decode("utf-8-sig", errors="replace").strip()
    if not text:
        raise DocumentError("The text file is empty.")
    yield RenderedPage(image=None, text=text, kind=PageKind.TEXT)
