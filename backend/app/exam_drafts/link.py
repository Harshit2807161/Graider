"""Link rubric items to questions: exact canonical labels in code; the model only for the rest."""

from typing import Literal, Optional

from pydantic import ConfigDict, create_model

from app.exam_drafts.merge import RubricPiece
from app.exam_drafts.schema import DraftQuestion
from app.llm.router import get_router
from app.llm.types import CallContext, LLMRequest, Role, TextPart

NONE = "none"

SYSTEM_PROMPT = """You match items of a marking scheme to the exam questions they mark. Labels in a \
marking scheme are often written differently from the paper ("3" for a question whose parts are "3(a)" \
and "3(b)", "Q3a", "Ans 3 (i)"). Use the label and the content. If an item marks a whole question that \
has parts, choose the part it fits best only when the content makes that clear; otherwise answer \
"none". Never guess: "none" is better than a wrong match."""


def links_schema(labels: list[str]) -> type:
    label_type = Literal[tuple([*labels, NONE])]  # type: ignore[valid-type]
    link = create_model("RubricLink", __config__=ConfigDict(extra="forbid"), item=(int, ...), label=(label_type, ...))
    return create_model("RubricLinks", __config__=ConfigDict(extra="forbid"), links=(list[link], ...))  # type: ignore[valid-type]


def exact_links(questions: list[DraftQuestion], pieces: list[RubricPiece]) -> dict[int, Optional[str]]:
    labels = {q.label for q in questions}
    return {i: piece.label for i, piece in enumerate(pieces) if piece.label in labels}


async def link_rubric(
    questions: list[DraftQuestion], pieces: list[RubricPiece], context: Optional[CallContext] = None
) -> dict[int, Optional[str]]:
    """Every piece -> the label of the question it marks, or None. One model call, only for pieces
    whose label doesn't match a question exactly."""
    links: dict[int, Optional[str]] = exact_links(questions, pieces)
    leftover = [i for i in range(len(pieces)) if i not in links]
    if not leftover or not questions:
        return {i: links.get(i) for i in range(len(pieces))}

    listing = "\n".join(f"- {q.label}: {(q.context + ' ' if q.context else '')}{q.text}"[:240] for q in questions)
    items = "\n".join(f"{i}. [{pieces[i].printed_label}] {pieces[i].text[:400]}" for i in leftover)
    result = await get_router().call(
        LLMRequest(
            role=Role.RUBRIC_PARSER,
            system=SYSTEM_PROMPT,
            parts=[TextPart(text=f"Questions:\n{listing}\n\nMarking scheme items to match:\n{items}")],
            output_schema=links_schema([q.label for q in questions]),
            context=context or CallContext(purpose="link_rubric"),
        )
    )
    for link in result.parsed.links:
        if link.item in leftover:
            links[link.item] = None if link.label == NONE else link.label
    return {i: links.get(i) for i in range(len(pieces))}
