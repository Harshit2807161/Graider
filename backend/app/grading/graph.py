"""The submission graph: read every page in parallel, stitch the answers, grade every question in
parallel (LangGraph `Send` fan-out; `GRADING_MAX_CONCURRENCY` bounds both)."""

import operator
from typing import Annotated, Any, Optional, TypedDict
from uuid import UUID

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from app.core.config import settings
from app.grading.choices import not_attempted
from app.grading.question import ExamSettings, QuestionInput, QuestionOutcome, grade_question
from app.grading.stitch import Stitched, stitch
from app.grading.transcribe import SheetPage, check_inventory, transcribe_page
from app.services.labels import ChoiceGroup


class QuestionInfo(TypedDict):
    question_id: UUID
    label: str
    text: str
    max_score: float
    spec: Any  # RubricSpec | None


class GradingState(TypedDict, total=False):
    run_id: UUID
    pages: list[SheetPage]
    questions: list[QuestionInfo]
    choice_groups: list[ChoiceGroup]
    exam: ExamSettings
    skip: set[str]  # labels not to grade: unattempted alternatives of choice groups
    page_results: Annotated[list[tuple[int, dict]], operator.add]
    stitched: Optional[Stitched]
    outcomes: Annotated[list[QuestionOutcome], operator.add]


def _read_pages(state: GradingState) -> list[Send]:
    return [Send("read_page", {"page": page, "questions": state["questions"], "count": len(state["pages"])})
            for page in state["pages"]]


async def read_page(piece: dict) -> dict:
    questions = piece["questions"]
    result = await transcribe_page(
        piece["page"], [q["label"] for q in questions], [(q["label"], q["text"]) for q in questions], piece["count"]
    )
    return {"page_results": [(piece["page"].number, result)]}


def stitch_pages(state: GradingState) -> dict:
    pages = sorted(state.get("page_results", []), key=lambda item: item[0])
    stitched = stitch([(number, result["segments"]) for number, result in pages],
                      {number: check_inventory(result) for number, result in pages})
    return {"stitched": stitched, "skip": not_attempted(state["choice_groups"], set(stitched.answers))}


def _grade_questions(state: GradingState) -> list[Send]:
    stitched, skip = state["stitched"], state["skip"]
    sends = [
        Send("grade", {"run_id": state["run_id"], "exam": state["exam"], "q": QuestionInput(
            q["question_id"], q["label"], q["text"], q["max_score"], q["spec"], stitched.answers.get(q["label"]))})
        for q in state["questions"] if q["label"] not in skip
    ]
    return sends or [Send("done", {})]


async def grade(piece: dict) -> dict:
    return {"outcomes": [await grade_question(piece["q"], piece["run_id"], piece["exam"])]}


def done(_: dict) -> dict:
    return {}


def build_graph():
    graph = StateGraph(GradingState)
    graph.add_node("read_page", read_page)
    graph.add_node("stitch", stitch_pages)
    graph.add_node("grade", grade)
    graph.add_node("done", done)
    graph.add_conditional_edges(START, _read_pages, ["read_page"])
    graph.add_edge("read_page", "stitch")
    graph.add_conditional_edges("stitch", _grade_questions, ["grade", "done"])
    graph.add_edge("grade", END)
    graph.add_edge("done", END)
    return graph.compile()


_graph = None


async def run_submission_graph(
    run_id: UUID, pages: list[SheetPage], questions: list[QuestionInfo], choice_groups: list[ChoiceGroup],
    exam: Optional[ExamSettings] = None,
) -> dict:
    """Read, stitch and grade. Returns the final state (stitched answers and one outcome per graded
    question). LLM errors while reading a page, and an exhausted budget, propagate."""
    global _graph
    if _graph is None:
        _graph = build_graph()
    return await _graph.ainvoke(
        {"run_id": run_id, "pages": pages, "questions": questions, "choice_groups": choice_groups,
         "exam": exam or ExamSettings.of()},
        config={"max_concurrency": settings.GRADING_MAX_CONCURRENCY, "run_name": "grade_submission"},
    )
