"""OCR: transcribe student answer sheets (images/PDF pages) with the `vision` model role."""

import base64
from pathlib import Path
from typing import Literal, Optional

import structlog
from pydantic import BaseModel, ConfigDict, create_model

from app.llm.router import get_router
from app.llm.types import CallContext, ImagePart, LLMAllTargetsFailed, LLMRequest, Role, TextPart
from app.schemas.grading import Answer, Question
from .pdf_service import process_directory_files_async

logger = structlog.get_logger(__name__)

# Maximum number of page images sent in one request; longer sheets are sent in batches
MAX_IMAGES_PER_REQUEST = 10

_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


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
        source: Path,
        questions: list[Question],
        context: Optional[CallContext] = None,
    ) -> list[Answer]:
        """
        Extract answers from an answer sheet file (image or PDF) or a directory of them.

        Args:
            source: Answer sheet file, or a directory of them
            questions: Questions to match answers to. Their `id`s are short labels ("Q1"),
                which become an enum in the output schema.
            context: Audit context (run/submission) copied onto every model call.

        Returns:
            One Answer per question label the model found, in the order found.

        Raises:
            OCRError: if the files can't be read or every vision model failed.
        """
        image_paths, text_contents = await process_directory_files_async(source)
        images = [_image_part(p) for p in image_paths if p.exists()]
        if not images and not text_contents:
            raise OCRError(f"No readable pages found in {source}")

        labels = [q.id for q in questions]
        schema = answer_transcription_schema(labels)
        question_context = "\n".join(
            f"- {q.id}: {q.text[:150]}..." if len(q.text) > 150 else f"- {q.id}: {q.text}" for q in questions
        )
        base_context = context or CallContext(purpose="ocr_answers")

        # Large answer sheets are sent in page batches; answers continuing across batches are joined
        batches = [images[i:i + MAX_IMAGES_PER_REQUEST] for i in range(0, len(images), MAX_IMAGES_PER_REQUEST)] or [[]]
        merged: dict[str, Answer] = {}
        for batch_index, batch in enumerate(batches):
            first_page = batch_index * MAX_IMAGES_PER_REQUEST + 1
            page_note = ""
            if len(batches) > 1:
                page_note = (
                    f"\nThese images are pages {first_page}-{first_page + len(batch) - 1} of a "
                    f"{len(images)}-page answer sheet. Only extract answers visible on these pages; "
                    "omit questions that don't appear here.\n"
                )

            parts: list = []
            # Embedded PDF text (typed documents) only needs to be sent once
            if text_contents and batch_index == 0:
                parts.append(TextPart(text="Extracted text from documents:\n\n" + "\n\n---\n\n".join(text_contents)))
            parts.extend(batch)
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
