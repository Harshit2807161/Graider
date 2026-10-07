"""Merge per-page extractions into one draft (pure code; no model calls).

The teacher's declared document roles decide what each page contributes: question papers and blank
copies give the questions; rubric documents give marking guidance (questions they repeat are not
taken twice). A question or rubric item marked as continued from the previous page is joined to it.
"""

from dataclasses import dataclass, field
from typing import Optional

from app.exam_drafts.schema import (
    DraftChoiceGroup,
    DraftContent,
    DraftPage,
    DraftQuestion,
    PageExtraction,
    UnmatchedRubric,
)
from app.models.document import DocumentRole

QUESTION_ROLES = {DocumentRole.QUESTION_PAPER, DocumentRole.QUESTION_PAPER_AND_RUBRIC, DocumentRole.BLANK_COPY}
RUBRIC_ROLES = {DocumentRole.RUBRIC, DocumentRole.QUESTION_PAPER_AND_RUBRIC, DocumentRole.BLANK_COPY}


@dataclass
class PageInput:
    document_id: str
    page_index: int
    declared_role: str
    extraction: PageExtraction

    @property
    def where(self) -> str:
        return f"{self.document_id}:{self.page_index}"


@dataclass
class RubricPiece:
    label: str
    printed_label: str
    text: str
    marks: Optional[float]
    pages: list[str] = field(default_factory=list)


def canonical(label: str) -> str:
    """The model writes canonical labels ("2(b)"); drop stray whitespace so "2 (b)" matches."""
    return "".join(label.split())


def merge(pages: list[PageInput], existing: Optional[list[DraftQuestion]] = None) -> tuple[DraftContent, list[RubricPiece]]:
    """Questions, choice groups and paper details from the pages, plus the rubric pieces to link.
    Without any question document, the exam's existing questions are used (rubric_only)."""
    questions: list[DraftQuestion] = []
    pieces: list[RubricPiece] = []
    raw_groups: list[tuple[list[str], int, str]] = []
    instructions: Optional[str] = None
    total_marks: Optional[float] = None

    for page in pages:
        extraction = page.extraction
        if page.declared_role in QUESTION_ROLES:
            instructions = instructions or extraction.instructions
            total_marks = total_marks if total_marks is not None else extraction.total_marks
            for q in extraction.questions:
                label = canonical(q.label)
                last = questions[-1] if questions else None
                if q.continued and last is not None and label in ("", last.label):
                    last.text = f"{last.text}\n{q.text.strip()}".strip()
                    last.marks = last.marks if last.marks is not None else q.marks
                    last.pages.append(page.where)
                    continue
                questions.append(DraftQuestion(
                    label=label, printed_label=q.printed_label, context=q.context, text=q.text.strip(),
                    marks=q.marks, question_type=q.question_type, pages=[page.where],
                ))
            raw_groups.extend(([canonical(x) for x in g.labels], g.pick, g.note) for g in extraction.choice_groups)
        if page.declared_role in RUBRIC_ROLES:
            for item in extraction.rubric_items:
                label = canonical(item.label)
                last_piece = pieces[-1] if pieces else None
                if item.continued and last_piece is not None and label in ("", last_piece.label):
                    last_piece.text = f"{last_piece.text}\n{item.text.strip()}".strip()
                    last_piece.marks = last_piece.marks if last_piece.marks is not None else item.marks
                    last_piece.pages.append(page.where)
                    continue
                pieces.append(RubricPiece(label, item.printed_label, item.text.strip(), item.marks, [page.where]))

    takes_questions = any(page.declared_role in QUESTION_ROLES for page in pages)
    if not takes_questions:
        questions = [q.model_copy(deep=True) for q in existing or []]

    groups: list[DraftChoiceGroup] = []
    seen: set[tuple[str, ...]] = set()
    for labels, pick, note in raw_groups:
        key = tuple(sorted(labels))
        if key in seen:
            continue
        seen.add(key)
        group = DraftChoiceGroup(id=f"g{len(groups) + 1}", labels=labels, pick=pick, note=note or None)
        groups.append(group)
        for question in questions:
            if question.label in labels:
                question.choice_group = group.id

    content = DraftContent(
        mode="questions" if takes_questions else "rubric_only",
        instructions=instructions,
        total_marks=total_marks,
        questions=questions,
        choice_groups=groups,
        pages=[
            DraftPage(document_id=p.document_id, page_index=p.page_index, declared_role=p.declared_role,
                      page_kind=p.extraction.page_kind, has_handwriting=p.extraction.has_handwriting)
            for p in pages
        ],
    )
    return content, pieces


def attach_rubric(content: DraftContent, pieces: list[RubricPiece], links: dict[int, Optional[str]]) -> list[str]:
    """Attach each rubric piece to the question it links to (piece index -> label, None = no question).
    Questions without printed marks take the marks their rubric awards. Returns labels whose marks
    came from the rubric."""
    by_label = {q.label: q for q in content.questions}
    marks_from_rubric: dict[str, float] = {}
    for index, piece in enumerate(pieces):
        question = by_label.get(links.get(index) or "")
        if question is None:
            content.unmatched_rubric.append(UnmatchedRubric(printed_label=piece.printed_label, text=piece.text))
            continue
        question.rubric = f"{question.rubric}\n{piece.text}" if question.rubric else piece.text
        if question.marks is None and piece.marks is not None:
            marks_from_rubric[question.label] = marks_from_rubric.get(question.label, 0.0) + piece.marks
    for label, marks in marks_from_rubric.items():
        by_label[label].marks = marks
    return sorted(marks_from_rubric)
