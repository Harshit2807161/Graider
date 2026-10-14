"""What the vision model returns for one page, and the draft the teacher checks and confirms."""

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

QuestionKind = Literal["descriptive", "mcq", "problem"]
PageKind = Literal["question_paper", "rubric", "mixed", "answers", "cover", "blank", "other"]


# ===== model output: one page =====

class PageQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(description='Canonical label: number, then each sub-part in brackets, e.g. "2", "2(b)", "2(b)(ii)"')
    printed_label: str = Field(description='The label exactly as printed, e.g. "Q.2 (b)"')
    context: Optional[str] = Field(description="Shared introduction of the parent question, for sub-parts")
    text: str = Field(description="The question text as printed (include options for multiple choice)")
    marks: Optional[float] = Field(description="Marks printed for this question, if any")
    question_type: QuestionKind
    continued: bool = Field(description="True if this continues a question that started on the previous page")


class PageRubricItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(description="Canonical label of the question this marks, as best you can tell")
    printed_label: str = Field(description="The label exactly as printed")
    text: str = Field(description="The marking guidance, as written (expected answer, mark points, alternatives)")
    marks: Optional[float] = Field(description="Marks this item awards in total, if printed")
    continued: bool = Field(description="True if this continues an item that started on the previous page")


class PageChoiceGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    labels: list[str] = Field(description="Canonical labels of the alternatives")
    pick: int = Field(description="How many of them the student must answer")
    note: str = Field(description='The instruction as printed, e.g. "Attempt either 5 or 6"')


class PageExtraction(BaseModel):
    """Output of the vision role for one page of an exam document."""

    model_config = ConfigDict(extra="forbid", title="PageExtraction")

    page_kind: PageKind
    has_handwriting: bool
    instructions: Optional[str] = Field(description="General instructions printed on this page, if any")
    total_marks: Optional[float] = Field(description="Total marks for the paper, if printed on this page")
    questions: list[PageQuestion]
    rubric_items: list[PageRubricItem]
    choice_groups: list[PageChoiceGroup]


# ===== the draft =====

class DraftQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    printed_label: Optional[str] = None
    context: Optional[str] = None
    text: str
    marks: Optional[float] = None
    question_type: QuestionKind = "descriptive"
    rubric: Optional[str] = None  # the rubric text the M4 parser will turn into criteria
    choice_group: Optional[str] = None
    pages: list[str] = []  # where it came from: "document_id:page_index"


class DraftChoiceGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    labels: list[str]
    pick: int
    note: Optional[str] = None


class UnmatchedRubric(BaseModel):
    model_config = ConfigDict(extra="forbid")

    printed_label: str
    text: str


class DraftPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: str
    page_index: int
    declared_role: str
    page_kind: str
    has_handwriting: bool


class DraftContent(BaseModel):
    """The exam as extracted (or as the teacher corrected it)."""

    model_config = ConfigDict(extra="forbid")

    mode: Literal["questions", "rubric_only"]  # rubric_only: adds rubrics to the exam's existing questions
    instructions: Optional[str] = None
    total_marks: Optional[float] = None
    questions: list[DraftQuestion]
    choice_groups: list[DraftChoiceGroup] = []
    unmatched_rubric: list[UnmatchedRubric] = []
    pages: list[DraftPage] = []


class Issue(BaseModel):
    severity: Literal["blocking", "warning"]
    code: str
    message: str
    label: Optional[str] = None
    details: Optional[dict[str, Any]] = None  # e.g. internal_choice: the suggested split
