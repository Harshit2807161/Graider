"""Assemble each question's answer from per-page segments (pure code).

Pages are read in order. A segment that doesn't start a new answer continues the previous one, even
across pages. Crossed-out work is kept in the record but not in the answer. Segments the model
couldn't place go to an unassigned bucket for the teacher; they are never attached by guesswork.
"""

from dataclasses import dataclass, field
from typing import Any, Optional

from app.grading.schemas import PAGE_INVENTORY_MISMATCH, UNASSIGNED
from app.grading.transcribe import PageCheck

# Informational: a segment the student struck out entirely was left out of the answer.
CROSSED_OUT_EXCLUDED = "crossed_out_work_excluded"


@dataclass
class StitchedAnswer:
    label: str
    parts: list[str] = field(default_factory=list)
    segments: list[dict[str, Any]] = field(default_factory=list)
    starts: int = 0
    page_flags: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n".join(p for p in self.parts if p.strip()).strip()

    @property
    def confidence(self) -> Optional[float]:
        scores = [s["confidence"] for s in self.segments if not s["crossed_out"]]
        return min(scores) if scores else None

    @property
    def dropped_crossed_out(self) -> bool:
        return any(s["crossed_out"] for s in self.segments)

    @property
    def flags(self) -> list[str]:
        """Shown to the teacher; multiple_attempts and page_inventory_mismatch escalate (see grade_question)."""
        flags = ["multiple_attempts"] if self.starts > 1 else []
        if self.dropped_crossed_out:
            flags.append(CROSSED_OUT_EXCLUDED)
        return flags + self.page_flags


@dataclass
class Stitched:
    answers: dict[str, StitchedAnswer]
    unassigned: list[dict[str, Any]]


def stitch(pages: list[tuple[int, list[dict[str, Any]]]], checks: Optional[dict[int, PageCheck]] = None) -> Stitched:
    """pages: (page number, segments as the model returned them), in submission order. checks: per page,
    what its inventory listed that the segments miss; the answers it touches are flagged for the teacher."""
    answers: dict[str, StitchedAnswer] = {}
    unassigned: list[dict[str, Any]] = []
    last: Optional[str] = None
    for page_number, segments in pages:
        for segment in segments:
            record = {**segment, "page": page_number}
            label = segment["label"]
            if label == UNASSIGNED:
                if segment["starts_answer"] or last is None:
                    unassigned.append(record)
                    continue
                label = last  # an unnumbered continuation belongs to the answer before it
                record["continues"] = last
            answer = answers.setdefault(label, StitchedAnswer(label))
            answer.segments.append(record)
            if segment["crossed_out"]:
                continue
            if segment["starts_answer"]:
                answer.starts += 1
            answer.parts.append(segment["text"])
            last = label
    for page_number, check in (checks or {}).items():
        if not check.mismatch:
            continue
        touched = {label for label in check.missing_labels if label in answers}
        if check.undescribed_drawings:
            touched |= {a.label for a in answers.values() if any(s["page"] == page_number for s in a.segments)}
        for label in touched:
            if PAGE_INVENTORY_MISMATCH not in answers[label].page_flags:
                answers[label].page_flags.append(PAGE_INVENTORY_MISMATCH)
    return Stitched(answers, unassigned)
