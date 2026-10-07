"""One vision call per page of an exam document: what the page is and what's on it."""

import base64
from pathlib import Path
from typing import Optional

from app.exam_drafts.schema import PageExtraction
from app.llm.router import get_router
from app.llm.types import CallContext, ImagePart, LLMRequest, Role, TextPart
from app.models.document import DocumentPage, DocumentRole

PROMPT_VERSION = "exam-page-v1"

ROLE_DESCRIPTION = {
    DocumentRole.QUESTION_PAPER: "a question paper",
    DocumentRole.RUBRIC: "a rubric / marking scheme / answer key",
    DocumentRole.QUESTION_PAPER_AND_RUBRIC: "a question paper that includes its marking scheme",
    DocumentRole.BLANK_COPY: "a blank copy of the sheet students write on (printed questions, maybe marks or "
                             "a rubric, and empty space for answers)",
}

SYSTEM_PROMPT = """You read one page of an exam document and record exactly what is printed on it, so \
students' answers can later be graded against it. Never solve the questions or invent anything.

page_kind: question_paper (questions), rubric (marking guidance, answers key, mark scheme), mixed \
(questions together with their marking guidance), answers (mostly a student's handwritten answers), \
cover (title page or instructions only), blank, or other.

questions: every question a student answers and is marked on.
- label: the canonical label: the question number, then each sub-part in brackets, e.g. "3", "3(a)", \
"3(a)(ii)". Use lower-case letters and roman numerals as printed.
- A question split into parts: list only the parts, and put the shared text that comes before the parts \
in each part's context.
- text: as printed, including multiple-choice options. question_type: mcq (options to choose from), \
problem (calculation or working), otherwise descriptive.
- marks: only if printed for that question or part ("[2]", "(3 marks)", "2M", a marks column), else null.
- continued: true only when the page starts with the rest of a question from the previous page.

rubric_items: marking guidance for a question: expected answers, value points, mark allocation, \
accepted alternatives. label: the canonical label of the question it marks. text: as written. marks: \
the total the item awards, if printed. continued: as for questions.

choice_groups: wherever students choose ("Attempt either 5 or 6", "OR" between questions, "Answer any \
three of the following"): the labels of the alternatives and how many to answer.

instructions: general instructions printed on the page. total_marks: the paper's maximum marks, if \
printed ("Maximum Marks: 80").

Ignore headers, footers, page numbers and watermarks. has_handwriting: true if anything is handwritten."""


def _image_part(path: str) -> ImagePart:
    data = base64.standard_b64encode(Path(path).read_bytes()).decode("ascii")
    return ImagePart(data=data, media_type="image/jpeg", ref=path)


def page_parts(page: DocumentPage, declared_role: str, number: int, count: int) -> list:
    parts: list = [TextPart(text=(
        f"The teacher says this document is {ROLE_DESCRIPTION.get(declared_role, 'exam material')}. "
        f"This is page {number} of {count}."
    ))]
    if page.text_layer:
        parts.append(TextPart(text=(
            "Typed text found on this page (from the file; handwriting and images are not included):\n"
            f"{page.text_layer}"
        )))
    if page.image_path:
        parts.append(_image_part(page.image_path))
    return parts


async def extract_page(
    page: DocumentPage, declared_role: str, number: int, count: int, context: Optional[CallContext] = None
) -> PageExtraction:
    """Raises LLMError if no model produced a usable answer."""
    result = await get_router().call(
        LLMRequest[PageExtraction](
            role=Role.VISION,
            system=SYSTEM_PROMPT,
            parts=page_parts(page, declared_role, number, count),
            output_schema=PageExtraction,
            context=context or CallContext(purpose="extract_exam_page"),
        )
    )
    return result.parsed
