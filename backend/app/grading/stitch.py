"""Assemble each question's answer from per-page segments (pure code).

Pages are read in order. A segment that doesn't start a new answer continues the previous one, even
across pages. Crossed-out work is kept in the record but not in the answer. Segments the model
couldn't place go to an unassigned bucket for the teacher; they are never attached by guesswork.
"""

from dataclasses import dataclass, field
from typing import Any, Optional

from app.grading.schemas import UNASSIGNED


@dataclass
class StitchedAnswer:
    label: str
    parts: list[str] = field(default_factory=list)
    segments: list[dict[str, Any]] = field(default_factory=list)
    starts: int = 0

    @property
    def text(self) -> str:
        return "\n".join(p for p in self.parts if p.strip()).strip()

    @property
    def confidence(self) -> Optional[float]:
        scores = [s["confidence"] for s in self.segments if not s["crossed_out"]]
        return min(scores) if scores else None

    @property
    def flags(self) -> list[str]:
        return ["multiple_attempts"] if self.starts > 1 else []


@dataclass
class Stitched:
    answers: dict[str, StitchedAnswer]
    unassigned: list[dict[str, Any]]


def stitch(pages: list[tuple[int, list[dict[str, Any]]]]) -> Stitched:
    """pages: (page number, segments as the model returned them), in submission order."""
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
    return Stitched(answers, unassigned)
