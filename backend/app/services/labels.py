"""Question labels used in grading and choice groups ("attempt either 5 or 6")."""

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.exam import Question


def fallback_label(index: int) -> str:
    """Short, stable id ("Q1", "Q2", ...) that the OCR model can echo back reliably."""
    return f"Q{index + 1}"


def exam_labels(questions: list[Question]) -> list[str]:
    """Labels for an exam's questions, in order: the paper's labels if every question has a unique
    one, otherwise Q1..Qn for all (a mix would be ambiguous for the vision model)."""
    labels = [q.label for q in questions]
    if all(labels) and len(set(labels)) == len(labels):
        return labels  # type: ignore[return-value]
    return [fallback_label(i) for i in range(len(questions))]


class ChoiceGroup(BaseModel):
    """Students answer `pick` of the questions in `labels` (e.g. "attempt either 5 or 6": pick 1)."""

    model_config = ConfigDict(extra="forbid")

    id: str
    labels: list[str] = Field(min_length=2)
    pick: int = Field(ge=1)
    note: Optional[str] = None


def choice_groups(config: dict[str, Any]) -> list[ChoiceGroup]:
    return [ChoiceGroup.model_validate(g) for g in (config or {}).get("choice_groups", [])]


def duplicate_labels(labels: list[Optional[str]]) -> list[str]:
    seen, duplicates = set(), set()
    for label in labels:
        if label:
            (duplicates if label in seen else seen).add(label)
    return sorted(duplicates)
