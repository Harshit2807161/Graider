"""Model output schemas, built per exam / question so the model can only name real labels and
criteria (the label and criterion enums are enforced by the model API)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, create_model

GRADER_FLAGS = ("illegible", "off_topic", "answers_another_question", "incomplete_transcription")
UNASSIGNED = "unassigned"


def _model(name: str, **fields) -> type[BaseModel]:
    return create_model(name, __config__=ConfigDict(extra="forbid", title=name), **fields)


def page_answers_schema(labels: list[str]) -> type[BaseModel]:
    """One page of a student's submission, split into answer segments."""
    segment = _model(
        "AnswerSegment",
        label=(Literal[tuple([*labels, UNASSIGNED])], Field(description="Which question this answers")),  # type: ignore[misc]
        label_as_written=(str, Field(description='The question number as the student wrote it ("Ans 3", "3(b)"), or ""')),
        text=(str, Field(description="The student's own writing, transcribed exactly")),
        starts_answer=(bool, Field(description="False if it continues an answer from earlier (no new number)")),
        crossed_out=(bool, Field(description="True if the student struck it out")),
        confidence=(float, Field(description="How sure you are of the transcription, 0 to 1")),
    )
    return _model(
        "PageAnswers",
        page_kind=(Literal["answers", "mixed", "question_paper", "cover", "blank", "other"], ...),
        has_handwriting=(bool, ...),
        segments=(list[segment], ...),  # type: ignore[valid-type]
    )


def _criterion(ids: list[str]) -> type[BaseModel]:
    return _model(
        "CriterionResult",
        id=(Literal[tuple(ids)], ...),  # type: ignore[misc]
        score=(float, ...),
        evidence=(str, Field(description="The student's exact words that earn the score; empty if score is 0")),
        justification=(str, ...),
    )


def grade_schema(criterion_ids: list[str]) -> type[BaseModel]:
    return _model(
        "GradeResult",
        criteria=(list[_criterion(criterion_ids)], ...),  # type: ignore[misc]
        feedback=(str, Field(description="Short, specific feedback for the student")),
        flags=(list[Literal[GRADER_FLAGS]], Field(description="Problems that need a teacher instead of a grade")),  # type: ignore[valid-type]
    )


def review_schema(criterion_ids: list[str]) -> type[BaseModel]:
    own = _model(
        "OwnAssessment", id=(Literal[tuple(criterion_ids)], ...), score=(float, ...), reason=(str, ...),  # type: ignore[misc]
    )
    point = _model(
        "FeedbackPoint",
        criterion_id=(Literal[tuple(criterion_ids)], ...),  # type: ignore[misc]
        point=(str, Field(description="What the grader got wrong for this criterion, and why")),
    )
    return _model(
        "EvaluatorReview",
        own_assessment=(list[own], Field(description="Your own score for every criterion, decided BEFORE reviewing the grader")),  # type: ignore[valid-type]
        agreement=(float, Field(description="How far you agree with the grader overall, 0 to 1")),
        feedback=(list[point], ...),  # type: ignore[valid-type]
        summary=(str, ...),
    )


def revision_schema(criterion_ids: list[str]) -> type[BaseModel]:
    reply = _model(
        "FeedbackReply",
        feedback_index=(int, ...),
        decision=(Literal["accept", "reject"], ...),
        rationale=(str, ...),
    )
    return _model(
        "GradeRevision",
        replies=(list[reply], Field(description="One reply per feedback point, in order")),  # type: ignore[valid-type]
        criteria=(list[_criterion(criterion_ids)], ...),  # type: ignore[misc]
        feedback=(str, ...),
        flags=(list[Literal[GRADER_FLAGS]], ...),  # type: ignore[valid-type]
    )
