"""OCR: transcribe a student's answer pages with the `vision` model role.

Pages come from document intake (app/ingestion): upright, size-capped images plus the typed text
of digital PDF pages, which is sent alongside the image as a hint (never instead of it).
"""

import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

import structlog
from pydantic import BaseModel, ConfigDict, create_model

from app.llm.router import get_router
from app.llm.types import CallContext, ImagePart, LLMAllTargetsFailed, LLMRequest, Role, TextPart
from app.schemas.grading import Answer, Question

logger = structlog.get_logger(__name__)

# Maximum number of pages sent in one request; longer submissions are sent in batches
MAX_IMAGES_PER_REQUEST = 10

_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


@dataclass(frozen=True)
class SheetPage:
    """One page of a student's submission, as the vision model sees it."""

    number: int  # 1-based, across all of the submission's files
    image_path: Optional[Path]  # None for a plain-text page
    text_layer: Optional[str]  # typed text from a digital PDF page or a text file


class OCRError(RuntimeError):
    """Answer sheets could not be transcribed."""


def answer_transcription_schema(labels: list[str]) -> type[BaseModel]:
    """Output schema whose question_id must be one of this exam's labels (enforced by the model API)."""
    label_type = Literal[tuple(labels)]  # type: ignore[valid-type]
    item = create_model(
        "TranscribedAnswer",
        __config__=ConfigDict(extra="forbid"),
        question_id=(label_type, ...),
        text=(str, ...),
        confidence=(float, ...),
    )
    return create_model(
        "AnswerTranscription",
        __config__=ConfigDict(extra="forbid"),
        answers=(list[item], ...),  # type: ignore[valid-type]
    )


def _image_part(path: Path) -> ImagePart:
    data = base64.standard_b64encode(path.read_bytes()).decode("ascii")
    return ImagePart(data=data, media_type=_MEDIA_TYPES.get(path.suffix.lower(), "image/jpeg"), ref=str(path))


def _page_parts(page: SheetPage) -> list:
    """A page as model input: its typed text (if any) as a hint, then its image."""
    if page.image_path is None:
        return [TextPart(text=f"Page {page.number} (typed document):\n{page.text_layer or ''}")]
    parts: list = [TextPart(text=f"Page {page.number}:")]
    if page.text_layer:
        parts.append(TextPart(text=(
            f"Typed text found on page {page.number} (from the PDF; handwriting is never included, so "
            f"read the image for it):\n{page.text_layer}"
        )))
    parts.append(_image_part(page.image_path))
    return parts


INSTRUCTIONS = """Analyze these student answer sheet documents and extract ALL answers.
{page_note}
The documents may contain handwritten answers (most common), printed/typed answers, a mix of
both, and mathematical equations, diagrams or formulas.

The questions being answered are:
{question_context}

For each answer found, provide:
1. question_id: one of these ids: {ids}
2. text: the complete answer text (transcribe handwriting carefully, include all work shown)
3. confidence: your confidence in the transcription accuracy (0.0 to 1.0)

Important:
- Transcribe handwritten text as accurately as possible
- For mathematical work, include all steps and calculations
- If handwriting is unclear, make your best interpretation and lower confidence
- Students may not write the question number exactly; match by position/context and use the ids above
- Include partial or incomplete answers
- Look for answer numbers that may be written as "1.", "1)", "Ans 1:", etc."""


class OCRService:
    """Transcribes answer sheets through the model router (`vision` role)."""

    async def extract_answers(
        self,
        pages: list[SheetPage],
        questions: list[Question],
        context: Optional[CallContext] = None,
    ) -> list[Answer]:
        """
        Extract answers from a submission's pages.

        Args:
            pages: The submission's pages in order (images and/or typed text)
            questions: Questions to match answers to. Their `id`s are short labels ("Q1"),
                which become an enum in the output schema.
            context: Audit context (run/submission) copied onto every model call.

        Returns:
            One Answer per question label the model found, in the order found.

        Raises:
            OCRError: if there are no pages or every vision model failed.
        """
        if not pages:
            raise OCRError("The submission has no readable pages")

        labels = [q.id for q in questions]
        schema = answer_transcription_schema(labels)
        question_context = "\n".join(
            f"- {q.id}: {q.text[:150]}..." if len(q.text) > 150 else f"- {q.id}: {q.text}" for q in questions
        )
        base_context = context or CallContext(purpose="ocr_answers")

        # Long submissions are sent in page batches; answers continuing across batches are joined
        batches = [pages[i:i + MAX_IMAGES_PER_REQUEST] for i in range(0, len(pages), MAX_IMAGES_PER_REQUEST)]
        merged: dict[str, Answer] = {}
        for batch_index, batch in enumerate(batches):
            page_note = ""
            if len(batches) > 1:
                page_note = (
                    f"\nThese are pages {batch[0].number}-{batch[-1].number} of a {len(pages)}-page "
                    "submission. Only extract answers visible on these pages; omit questions that don't "
                    "appear here.\n"
                )

            parts: list = []
            for page in batch:
                parts.extend(_page_parts(page))
            parts.append(
                TextPart(
                    text=INSTRUCTIONS.format(
                        page_note=page_note, question_context=question_context, ids=", ".join(labels)
                    )
                )
            )

            logger.info("ocr_answers_start", batch=batch_index + 1, batches=len(batches), images=len(batch))
            try:
                result = await get_router().call(
                    LLMRequest[schema](
                        role=Role.VISION,
                        system="You transcribe student answer sheets accurately and completely.",
                        parts=parts,
                        output_schema=schema,
                        context=base_context.model_copy(update={"purpose": "ocr_answers"}),
                    )
                )
            except LLMAllTargetsFailed as e:
                raise OCRError(f"Could not transcribe the answer sheet: {e}") from e

            for item in result.parsed.answers:
                answer = Answer(question_id=item.question_id, text=item.text, confidence=item.confidence)
                previous = merged.get(answer.question_id)
                if previous is None:
                    merged[answer.question_id] = answer
                else:
                    merged[answer.question_id] = Answer(
                        question_id=answer.question_id,
                        text=f"{previous.text}\n{answer.text}",
                        confidence=min(previous.confidence, answer.confidence),
                    )

        answers = list(merged.values())
        logger.info("ocr_answers_complete", answer_count=len(answers))
        return answers


def get_ocr_service() -> OCRService:
    """OCR service (stateless; model clients live in the per-run router)."""
    return OCRService()
