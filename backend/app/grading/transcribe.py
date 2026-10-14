"""Read one page of a student's submission into answer segments (the `vision` role)."""

import base64
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from app.grading import prompts
from app.grading.schemas import UNASSIGNED, page_answers_schema
from app.llm.router import get_router
from app.llm.types import CallContext, ImagePart, LLMRequest, Role, TextPart


_DRAWING = re.compile(r"\[[^\]]*(diagram|drawing|figure|graph|sketch|plot|chart|table|map|circuit)", re.IGNORECASE)


@dataclass(frozen=True)
class PageCheck:
    """What the page's inventory listed that the segments don't account for."""

    missing_labels: tuple[str, ...]
    undescribed_drawings: bool

    @property
    def mismatch(self) -> bool:
        return bool(self.missing_labels) or self.undescribed_drawings


def check_inventory(result: dict[str, Any]) -> PageCheck:
    """Compare the reader's own inventory of the page with the segments it produced: a question it saw
    with no segment, or drawings it counted with no bracketed description, means part of the page was
    skipped."""
    inventory = result.get("inventory") or {"labels_seen": [], "drawings": 0}
    segments = result.get("segments", [])
    labelled = {s["label"] for s in segments if s["label"] != UNASSIGNED}
    missing = tuple(label for label in dict.fromkeys(inventory["labels_seen"]) if label not in labelled)
    described = sum(len(_DRAWING.findall(s["text"])) for s in segments)
    return PageCheck(missing, inventory["drawings"] > described)


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


async def transcribe_page(page: SheetPage, labels: list[str], questions: list[tuple[str, str]], count: int) -> dict[str, Any]:
    """Raises LLMError if no model could read the page (the run fails: nothing can be graded fairly)."""
    result = await get_router().call(LLMRequest(
        role=Role.VISION,
        system=prompts.TRANSCRIBE_SYSTEM,
        parts=page_parts(page, questions, count),
        output_schema=page_answers_schema(labels),
        context=CallContext(purpose="transcribe_page", round=page.number),
    ))
    return result.parsed.model_dump()
