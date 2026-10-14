"""Grading prompts (Proposal 002 §7.2). Bump PROMPT_VERSION when any prompt or example changes; it
is recorded in every grading run's config snapshot."""

import json
from typing import Optional

from app.rubrics.schema import RubricSpec

PROMPT_VERSION = "grading-v2.1"

# Subject personas: what a good examiner in each subject pays attention to (the rubric decides marks)
PERSONAS = {
    "math": "You are an experienced mathematics examiner. Method matters: credit correct steps even when "
            "a later calculation slips, and be lenient on notation when the meaning is clear.",
    "science": "You are an experienced science examiner. Credit correct concepts and reasoning; proper terms "
               "matter but don't outweigh understanding. Diagrams may be described in words.",
    "english": "You are an experienced English examiner. Content and argument come first; judge language "
               "against the rubric, not your own taste.",
    "history": "You are an experienced history and social science examiner. Facts, dates and causes must be "
               "correct; credit specific, relevant evidence.",
    "general": "You are an experienced examiner. Credit what the answer actually shows, point by point.",
}


def persona(subject: Optional[str]) -> str:
    return PERSONAS.get(subject or "general", PERSONAS["general"])


# ===== transcription =====

TRANSCRIBE_SYSTEM = """You read one page of a student's exam submission and transcribe the STUDENT'S \
answers, split by question. You are given the exam's questions so you know what is printed material.

- Transcribe only what the student wrote or typed. Printed questions, instructions, rubrics and \
headers are not answers: leave them out.
- One segment per answer (or part of an answer) on the page, in reading order. label: the question \
it answers, from the list; use "unassigned" only if you can't tell. label_as_written: the number the \
student wrote, if any.
- starts_answer: false when the segment continues an answer from an earlier page or place (no new \
number), true otherwise.
- Copy the student's words exactly, including mistakes. Write maths on one line per step. Describe a \
diagram briefly in brackets, e.g. [diagram: number line with a closed circle at 5].
- Transcribe every line of the student's work, down to the last one: final answers that are circled, \
boxed or underlined matter most, so never stop early.
- Struck-through words or lines inside an answer the student otherwise kept: leave them out of the \
text and keep the rest; do not mark the segment crossed_out.
- crossed_out: true only for a whole block the student struck out entirely (still transcribe it).
- confidence: how sure you are of the reading, 0 to 1. Lower it for unclear handwriting.
- A blank page has no segments."""


def transcribe_prompt(questions: list[tuple[str, str]], number: int, count: int) -> str:
    listing = "\n".join(f"- {label}: {text[:200]}" for label, text in questions)
    return f"The exam's questions:\n{listing}\n\nThis is page {number} of {count} of the student's submission."


# ===== grader =====

GRADER_RULES = """Grade one student answer against the rubric's criteria.

- Score every criterion, using only the rubric and what the answer actually says. Don't reward what \
the student didn't write.
- evidence: copy the student's exact words that earn the score (a short quote). A criterion with no \
evidence scores 0 and has empty evidence.
- A pass/fail criterion scores either 0 or its full points. Other criteria may get partial credit as \
the rubric's notes allow.
- justification: why this score, in one or two sentences.
- feedback: what the student did well and what was missing, briefly, addressed to the student.
- flags: use them instead of guessing when the answer is illegible, off topic, answers a different \
question, or the transcription is clearly incomplete.

Example (criteria). Rubric: [c1] Subtracts 5 from both sides (1 pt); [c2] Divides both sides by 2 \
(1 pt); [c3] States x = 5 (1 pt). Answer: "2x = 10 so x = 2 x 10 = 20". Result:
{"criteria": [
  {"id": "c1", "score": 1, "evidence": "2x = 10", "justification": "Subtracting 5 gives 2x = 10."},
  {"id": "c2", "score": 0, "evidence": "", "justification": "Multiplies by 2 instead of dividing."},
  {"id": "c3", "score": 0, "evidence": "", "justification": "Gives x = 20, not 5."}],
 "feedback": "Good first step. To undo 2x, divide both sides by 2: x = 5.", "flags": []}

Example (pass/fail). Rubric: [c1] Names carbon dioxide (1 pt). Answer: "oxygen". Result:
{"criteria": [{"id": "c1", "score": 0, "evidence": "", "justification": "Names oxygen, which plants \
give out."}], "feedback": "Plants take in carbon dioxide and give out oxygen.", "flags": []}"""

REVISION_RULES = """A second examiner reviewed your grading and gave feedback. Reason independently: \
do not change a score just to agree. Judge each feedback point on its merits. Accept it if it is \
correct and change the grade; reject it with a specific rationale if it isn't. Reply to every point \
in order (feedback_index), then give the full, revised grading. A rejected point must leave that \
criterion's score unchanged."""

EVALUATOR_RULES = """You are a second examiner, a fresh pair of eyes, checking another examiner's \
grading of one answer.

First, before looking at their grading, score every criterion yourself from the answer and the \
rubric (own_assessment). Then compare with their scores, evidence and justifications:
- agreement: 1.0 if you fully agree, lower for each criterion you'd score differently.
- feedback: one point per criterion you disagree with: what they got wrong and why, citing the \
answer. No feedback when you agree.
Disagree only for real reasons in the answer or the rubric, never out of caution."""


def spec_listing(spec: RubricSpec) -> str:
    lines = []
    if spec.kind == "pass_fail":
        lines.append("All or nothing: the criterion scores 0 or its full points.")
    for c in spec.criteria:
        line = f"[{c.id}] {c.description} ({c.points:g} pts)"
        if c.expected_answer:
            line += f". Expected: {c.expected_answer}"
        if c.notes:
            line += f". Notes: {c.notes}"
        lines.append(line)
    if spec.grading_notes:
        lines.append(f"General: {spec.grading_notes}")
    return "\n".join(lines)


def question_block(label: str, question_text: str, max_score: float, spec: RubricSpec, answer: str) -> str:
    return (
        f"Question {label} ({max_score:g} marks):\n{question_text}\n\n"
        f"Rubric:\n{spec_listing(spec)}\n\n"
        f"Student's answer (transcribed):\n{answer}"
    )


def grading_json(criteria: list[dict], feedback: str) -> str:
    return json.dumps({"criteria": criteria, "feedback": feedback}, indent=1)
