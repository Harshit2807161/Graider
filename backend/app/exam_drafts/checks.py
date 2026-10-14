"""Code checks on a draft. Blocking issues stop confirmation; warnings are shown to the teacher."""

from app.exam_drafts.schema import DraftContent, Issue
from app.models.document import DocumentRole
from app.services.labels import duplicate_labels

TOLERANCE = 1e-6


def expected_total(content: DraftContent) -> float | None:
    """Marks a full-scoring student gets: every compulsory question, plus `pick` of each choice group
    (the highest-marked alternatives). None if any question lacks marks."""
    if any(q.marks is None for q in content.questions):
        return None
    grouped = {q.label for g in content.choice_groups for q in content.questions if q.label in g.labels}
    total = sum(q.marks for q in content.questions if q.label not in grouped)  # type: ignore[misc]
    for group in content.choice_groups:
        marks = sorted((q.marks for q in content.questions if q.label in group.labels), reverse=True)
        total += sum(marks[: group.pick])  # type: ignore[arg-type]
    return total


def check_content(content: DraftContent) -> list[Issue]:
    issues: list[Issue] = []
    if not content.questions:
        issues.append(Issue(severity="blocking", code="no_questions", message="No questions were found."))
        return issues

    for label in duplicate_labels([q.label for q in content.questions]):
        issues.append(Issue(severity="blocking", code="duplicate_label", label=label,
                            message=f"Question {label} appears more than once. Rename or merge them."))
    for q in content.questions:
        if not q.label:
            issues.append(Issue(severity="blocking", code="missing_label",
                                message=f"A question has no label: {q.text[:60]!r}"))
        if not q.text.strip():
            issues.append(Issue(severity="blocking", code="empty_question", label=q.label,
                                message=f"Question {q.label} has no text."))
        if q.marks is None or q.marks <= 0:
            issues.append(Issue(severity="blocking", code="missing_marks", label=q.label,
                                message=f"Question {q.label} needs its marks."))
        if q.alternate_language_text:
            issues.append(Issue(severity="warning", code="bilingual_duplicate", label=q.label,
                                message=f"Question {q.label} appears in two languages; the English (Latin-script) "
                                        "text was kept and the other kept as its alternate."))
        if not (q.rubric or "").strip():
            outcome = ("keeps its current rubric" if content.mode == "rubric_only"
                       else "criteria will be derived from the question")
            issues.append(Issue(severity="warning", code="no_rubric", label=q.label,
                                message=f"No rubric found for question {q.label}; {outcome}."))

    labels = {q.label for q in content.questions}
    for group in content.choice_groups:
        unknown = [label for label in group.labels if label not in labels]
        if unknown:
            issues.append(Issue(severity="blocking", code="choice_unknown_question",
                                message=f"Choice group {group.id} refers to missing questions: {', '.join(unknown)}."))
        if not 1 <= group.pick < len(group.labels):
            issues.append(Issue(severity="blocking", code="choice_pick",
                                message=f"Choice group {group.id} must ask for 1 to {len(group.labels) - 1} of "
                                        f"{len(group.labels)} questions (asks for {group.pick})."))

    total = expected_total(content)
    if content.total_marks is not None and total is not None and abs(total - content.total_marks) > TOLERANCE:
        issues.append(Issue(severity="warning", code="total_mismatch",
                            message=f"The questions add up to {total:g} marks, but the paper says {content.total_marks:g}."))

    for item in content.unmatched_rubric:
        issues.append(Issue(severity="warning", code="unmatched_rubric",
                            message=f"Rubric item {item.printed_label!r} doesn't match any question: {item.text[:80]!r}"))
    return issues


def check_pages(content: DraftContent) -> list[Issue]:
    """Warnings about what the pages looked like compared with what the teacher said they are."""
    issues: list[Issue] = []
    for page in content.pages:
        where = f"Page {page.page_index + 1} of a {page.declared_role.replace('_', ' ')}"
        if page.page_kind == "answers":
            issues.append(Issue(severity="warning", code="answers_page",
                                message=f"{where} looks like a student's answers, not exam material."))
        elif page.declared_role == DocumentRole.QUESTION_PAPER and page.page_kind == "rubric":
            issues.append(Issue(severity="warning", code="role_mismatch",
                                message=f"{where} looks like a rubric; upload it as a rubric to use it."))
        elif page.declared_role == DocumentRole.RUBRIC and page.page_kind == "question_paper":
            issues.append(Issue(severity="warning", code="role_mismatch",
                                message=f"{where} looks like a question paper, not a rubric."))
        if page.declared_role == DocumentRole.BLANK_COPY and page.has_handwriting:
            issues.append(Issue(severity="warning", code="handwriting_on_blank_copy",
                                message=f"{where} has handwriting; is it a student's sheet rather than a blank copy?"))
    return issues
