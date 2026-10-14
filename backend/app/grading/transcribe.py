"""Read one page of a student's submission into answer segments (the `vision` role)."""

import base64
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from app.grading import prompts
from app.grading.schemas import page_answers_schema
from app.llm.router import get_router
from app.llm.types import CallContext, ImagePart, LLMRequest, Role, TextPart


@dataclass(frozen=True)
class SheetPage:
    """One page of a student's submission, as the vision model sees it."""

    number: int  # 1-based, across all of the submission's files
    image_path: Optional[Path]  # None for a plain-text page
    text_layer: Optional[str]  # typed text from a digital PDF page or a text file


def page_parts(page: SheetPage, questions: list[tuple[str, str]], count: int) -> list:
    parts: list = [TextPart(text=prompts.transcribe_prompt(questions, page.number, count))]
    if page.image_path is None:
        parts.append(TextPart(text=f"The page (a typed document):\n{page.text_layer or ''}"))
        return parts
    if page.text_layer:
        parts.append(TextPart(text=(
            "Typed text found on this page (from the file; handwriting is never included, so read the "
            f"image for it; printed questions in it are not answers):\n{page.text_layer}"
        )))
    data = base64.standard_b64encode(page.image_path.read_bytes()).decode("ascii")
    parts.append(ImagePart(data=data, media_type="image/jpeg", ref=str(page.image_path)))
    return parts


_CTRL_ARROW = re.compile(r"\x02[12]")
_CTRL_OTHER = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_transcript_text(text: str) -> str:
    """Repair control characters the small reader emits for symbols.

    Known pairs (seen in the CBSE run): \\x02 followed by 1 or 2 is an arrow, a lone
    \\x02 is an apostrophe. Any other C0 control character (tab, newline and
    carriage return are kept) is dropped. Conservative: nothing else is touched.
    """
    text = _CTRL_ARROW.sub("\u2192", text)
    text = text.replace("\x02", "'")
    return _CTRL_OTHER.sub("", text)


async def transcribe_page(page: SheetPage, labels: list[str], questions: list[tuple[str, str]], count: int) -> dict[str, Any]:
    """Raises LLMError if no model could read the page (the run fails: nothing can be graded fairly)."""
    result = await get_router().call(LLMRequest(
        role=Role.VISION,
        system=prompts.TRANSCRIBE_SYSTEM,
        parts=page_parts(page, questions, count),
        output_schema=page_answers_schema(labels),
        context=CallContext(purpose="transcribe_page", round=page.number),
    ))
    data = result.parsed.model_dump()
    for segment in data.get("segments", []):
        segment["text"] = clean_transcript_text(segment["text"])
    return data
