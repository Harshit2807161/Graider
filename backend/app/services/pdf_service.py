"""PDF processing service for converting PDFs to images."""

import asyncio
from pathlib import Path
from typing import Optional

import structlog

logger = structlog.get_logger(__name__)

# Try to import pdf2image for PDF to image conversion
try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    logger.warning("pdf2image not available, PDF image conversion disabled")

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False
    logger.warning("pypdf not available, PDF text extraction disabled")


class PDFService:
    """Service for processing PDF files."""

    def __init__(self, dpi: int = 150, max_image_size: tuple[int, int] = (1600, 2200)):
        """
        Initialize PDF service.

        Args:
            dpi: Resolution for PDF to image conversion (default 150 for balance of quality and API limits)
            max_image_size: Maximum dimensions (width, height) for output images
        """
        self.dpi = dpi
        self.max_image_size = max_image_size

    def is_pdf(self, file_path: Path) -> bool:
        """Check if a file is a PDF."""
        return file_path.suffix.lower() == ".pdf"

    def convert_pdf_to_images(
        self,
        pdf_path: Path,
        output_dir: Path,
        prefix: str = "page"
    ) -> list[Path]:
        """
        Convert PDF pages to PNG images.

        Args:
            pdf_path: Path to the PDF file
            output_dir: Directory to save converted images
            prefix: Prefix for output image filenames

        Returns:
            List of paths to converted images
        """
        logger.info(
            "convert_pdf_to_images_start",
            pdf=str(pdf_path),
            output_dir=str(output_dir),
            prefix=prefix,
            pdf2image_available=PDF2IMAGE_AVAILABLE
        )

        if not PDF2IMAGE_AVAILABLE:
            logger.error("pdf2image_not_available", pdf=str(pdf_path))
            return []

        # Ensure output directory exists
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            logger.info("output_dir_ready", output_dir=str(output_dir))
        except Exception as e:
            logger.error("output_dir_creation_failed", output_dir=str(output_dir), error=str(e))
            return []

        try:
            # Verify PDF file exists and is readable
            if not pdf_path.exists():
                logger.error("pdf_file_not_found", pdf=str(pdf_path))
                return []

            pdf_size = pdf_path.stat().st_size
            logger.info("pdf_file_verified", pdf=str(pdf_path), size_bytes=pdf_size)

            # Convert PDF to images
            logger.info("calling_convert_from_path", pdf=str(pdf_path), dpi=self.dpi)
            images = convert_from_path(
                pdf_path,
                dpi=self.dpi,
                fmt="png"
            )
            logger.info("convert_from_path_returned", pdf=str(pdf_path), image_count=len(images))

            output_paths = []
            for i, image in enumerate(images):
                output_path = output_dir / f"{prefix}_{i:03d}.png"
                logger.info("saving_image", page=i+1, output=str(output_path), original_size=image.size)

                # Resize image if it exceeds max dimensions (to avoid API limits)
                if image.width > self.max_image_size[0] or image.height > self.max_image_size[1]:
                    # Calculate scale factor to fit within max dimensions while preserving aspect ratio
                    scale_w = self.max_image_size[0] / image.width
                    scale_h = self.max_image_size[1] / image.height
                    scale = min(scale_w, scale_h)
                    new_width = int(image.width * scale)
                    new_height = int(image.height * scale)
                    logger.info(
                        "resizing_image",
                        page=i+1,
                        original_size=image.size,
                        new_size=(new_width, new_height),
                        scale=scale
                    )
                    # Use LANCZOS for high-quality downscaling
                    from PIL import Image as PILImage
                    image = image.resize((new_width, new_height), PILImage.LANCZOS)

                # Save with optimization to reduce file size
                image.save(output_path, "PNG", optimize=True)
                output_paths.append(output_path)
                logger.info(
                    "pdf_page_converted",
                    pdf=str(pdf_path),
                    page=i + 1,
                    output=str(output_path),
                    final_size=image.size
                )

            logger.info(
                "pdf_conversion_complete",
                pdf=str(pdf_path),
                pages=len(output_paths)
            )
            return output_paths

        except Exception as e:
            import traceback
            logger.error(
                "pdf_conversion_error",
                pdf=str(pdf_path),
                error=str(e),
                error_type=type(e).__name__,
                traceback=traceback.format_exc()
            )
            return []

    def extract_text_from_pdf(self, pdf_path: Path) -> str:
        """
        Extract text content from a PDF (for text-based PDFs).

        Args:
            pdf_path: Path to the PDF file

        Returns:
            Extracted text content
        """
        if not PYPDF_AVAILABLE:
            logger.error("pypdf_not_available", pdf=str(pdf_path))
            return ""

        try:
            text_parts = []
            with open(pdf_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(f"--- Page {i + 1} ---\n{page_text}")

            full_text = "\n\n".join(text_parts)
            logger.info(
                "pdf_text_extracted",
                pdf=str(pdf_path),
                pages=len(text_parts),
                chars=len(full_text)
            )
            return full_text

        except Exception as e:
            logger.error(
                "pdf_text_extraction_error",
                pdf=str(pdf_path),
                error=str(e)
            )
            return ""

    def process_pdf_for_ocr(
        self,
        pdf_path: Path,
        output_dir: Path,
        prefix: str = "page"
    ) -> tuple[list[Path], str]:
        """
        Process a PDF for OCR - converts to images and extracts any embedded text.

        Args:
            pdf_path: Path to the PDF file
            output_dir: Directory to save converted images
            prefix: Prefix for output image filenames

        Returns:
            Tuple of (list of image paths, extracted text)
        """
        images = self.convert_pdf_to_images(pdf_path, output_dir, prefix)
        text = self.extract_text_from_pdf(pdf_path)
        return images, text


def process_directory_files(
    directory: Path,
    output_dir: Optional[Path] = None
) -> tuple[list[Path], list[str]]:
    """
    Process all files in a directory, converting PDFs to images.

    Args:
        directory: Directory containing files to process
        output_dir: Optional output directory for converted images (defaults to same directory)

    Returns:
        Tuple of (list of image paths, list of extracted text contents)
    """
    pdf_service = PDFService()
    if output_dir is None:
        output_dir = directory.parent if directory.is_file() else directory

    logger.info(
        "process_directory_start",
        directory=str(directory),
        output_dir=str(output_dir),
        pdf2image_available=PDF2IMAGE_AVAILABLE,
        pypdf_available=PYPDF_AVAILABLE
    )

    all_images = []
    all_texts = []

    # Handle single file input
    if directory.is_file():
        files_found = [directory]
        logger.info(
            "single_file_found",
            file=str(directory),
            suffix=directory.suffix.lower()
        )
    else:
        # Get all files in directory
        files_found = list(directory.glob("*"))
        logger.info(
            "directory_files_found",
            directory=str(directory),
            file_count=len(files_found),
            files=[f.name for f in files_found]
        )

    for file_path in sorted(files_found):
        if file_path.is_dir():
            continue

        suffix = file_path.suffix.lower()
        logger.info(
            "processing_file",
            file=str(file_path),
            suffix=suffix
        )

        if suffix == ".pdf":
            # Convert PDF to images
            logger.info("pdf_conversion_starting", pdf=str(file_path), output_dir=str(output_dir))
            images, text = pdf_service.process_pdf_for_ocr(
                file_path,
                output_dir,
                prefix=file_path.stem
            )
            logger.info(
                "pdf_conversion_result",
                pdf=str(file_path),
                images_created=len(images),
                text_extracted=len(text) if text else 0,
                image_paths=[str(p) for p in images]
            )
            all_images.extend(images)
            if text:
                all_texts.append(text)

        elif suffix in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
            # Already an image
            all_images.append(file_path)
            logger.info("image_file_added", path=str(file_path))

        elif suffix in {".txt", ".md", ".json"}:
            # Text file
            try:
                text = file_path.read_text(encoding="utf-8")
                all_texts.append(text)
                logger.info("text_file_read", path=str(file_path), chars=len(text))
            except Exception as e:
                logger.error("text_file_read_error", path=str(file_path), error=str(e))

    logger.info(
        "process_directory_complete",
        directory=str(directory),
        total_images=len(all_images),
        total_texts=len(all_texts)
    )

    return all_images, all_texts


async def process_directory_files_async(
    directory: Path,
    output_dir: Optional[Path] = None
) -> tuple[list[Path], list[str]]:
    """
    Async wrapper for process_directory_files.
    Runs the blocking PDF operations in a thread pool.
    """
    return await asyncio.to_thread(process_directory_files, directory, output_dir)


# Global instance
_pdf_service: Optional[PDFService] = None


def get_pdf_service() -> PDFService:
    """Get PDF service instance."""
    global _pdf_service
    if _pdf_service is None:
        _pdf_service = PDFService()
    return _pdf_service
