"""Base grader class for specialized grading agents."""

import math
from abc import ABC, abstractmethod

import structlog
from pydantic import BaseModel, ConfigDict, field_validator

from app.llm.config import get_llm_settings
from app.llm.router import get_router
from app.llm.types import CallContext, LLMAllTargetsFailed, LLMRequest, Role, TextPart
from app.schemas.grading import GradingResult, Triplet

logger = structlog.get_logger(__name__)


class GradingError(RuntimeError):
    """A grader could not produce a usable result for a question."""


class GradeOutput(BaseModel):
    """Grader output schema (enforced by the model API, then validated here)."""

    model_config = ConfigDict(extra="forbid")

    score: float
    reasoning: str
    feedback: str
    confidence: float

    @field_validator("score", "confidence")
    @classmethod
    def _finite(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("must be a finite number")
        return value

    @field_validator("reasoning")
    @classmethod
    def _has_reasoning(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("reasoning must not be empty")
        return value


class BaseGrader(ABC):
    """
    Base class for specialized grading agents.

    Calls the `grader` model role through the model router (Claude, OpenAI or open-weight).
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of this grader."""
        pass

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """System prompt for this grader."""
        pass

    def _build_rubric_section(self, triplet: Triplet) -> str:
        rubric = triplet.expected_answer
        if not rubric or not (rubric.expected_points or rubric.sample_answer):
            return "Rubric: none provided. Grade on correctness and completeness."

        parts = []
        if rubric.expected_points:
            parts.append(
                "Teacher's rubric (grade against this; it takes precedence over your own judgement):\n"
                + "\n".join(f"- {point}" for point in rubric.expected_points)
            )
        if rubric.sample_answer:
            parts.append(f"Model answer:\n{rubric.sample_answer}")
        return "\n\n".join(parts)

    def _build_grading_prompt(self, triplet: Triplet) -> str:
        """Build the grading prompt for a triplet."""
        return f"""Grade the following student answer.

Question ({triplet.question_type.value}):
{triplet.question_text}

Maximum Score: {triplet.max_score} points

{self._build_rubric_section(triplet)}

Student's Answer (transcribed from handwriting):
{triplet.candidate_answer}

Provide your grading as a JSON object with these fields:
{{
  "score": <numeric score between 0 and {triplet.max_score}>,
  "reasoning": "<detailed explanation of how you arrived at this score, citing the rubric>",
  "feedback": "<constructive feedback for the student on how to improve>",
  "confidence": <your confidence in this grading from 0.0 to 1.0>
}}

Important:
- Be fair and consistent in grading
- Award partial credit where appropriate
- Consider both content accuracy and presentation
- Provide specific, actionable feedback
- If the answer is blank or "No answer provided", give 0 points

Return ONLY the JSON object."""

    def _build_retry_prompt(self, triplet: Triplet, evaluator_feedback: str) -> str:
        return f"""{self._build_grading_prompt(triplet)}

IMPORTANT - Previous Grading Feedback:
Your previous grading was reviewed and needs improvement. The evaluator provided this feedback:

"{evaluator_feedback}"

Please carefully consider this feedback and provide an improved grading that:
1. Addresses the specific concerns raised
2. Provides more detailed reasoning grounded in the rubric
3. Offers more specific and actionable feedback to the student
4. Reflects appropriate confidence in your assessment

Return ONLY the JSON object with your improved grading."""

    def _to_result(self, output: GradeOutput, triplet: Triplet) -> GradingResult:
        """Code checks on top of the schema: clamp the score into [0, max_score]."""
        score = output.score
        if score < 0 or score > triplet.max_score:
            logger.warning(
                "grader_score_out_of_range",
                grader=self.name,
                question_id=triplet.question_id,
                score=score,
                max_score=triplet.max_score,
            )
            score = max(0.0, min(score, triplet.max_score))

        return GradingResult(
            question_id=triplet.question_id,
            score=score,
            max_score=triplet.max_score,
            reasoning=output.reasoning.strip(),
            feedback=output.feedback.strip() or "No feedback provided",
            grader=self.name,
            confidence=max(0.0, min(output.confidence, 1.0)),
        )

    async def _run(self, triplet: Triplet, prompt: str, purpose: str) -> GradingResult:
        settings = get_llm_settings()
        try:
            result = await get_router().call(
                LLMRequest[GradeOutput](
                    role=Role.GRADER,
                    system=self.system_prompt,
                    parts=[TextPart(text=prompt)],
                    output_schema=GradeOutput,
                    context=CallContext(purpose=purpose, question_id=triplet.question_id),
                    # A grader fallback must never be the evaluator's model ("fresh eyes")
                    exclude_models=frozenset({settings.evaluator.model}),
                )
            )
        except LLMAllTargetsFailed as e:
            # Never record a made-up score: the submission fails (or, in v2, the answer escalates)
            raise GradingError(f"{self.name} could not grade question {triplet.question_id}: {e}") from e

        graded = self._to_result(result.parsed, triplet)
        logger.info(
            "grader_complete",
            grader=self.name,
            question_id=triplet.question_id,
            score=graded.score,
            confidence=graded.confidence,
            model=result.model_answered,
            fallback_used=result.fallback_used,
        )
        return graded

    async def grade(self, triplet: Triplet) -> GradingResult:
        """
        Grade a triplet and return the result.
        """
        logger.info(
            "grader_start",
            grader=self.name,
            question_id=triplet.question_id,
            max_score=triplet.max_score
        )
        return await self._run(triplet, self._build_grading_prompt(triplet), purpose="grade")

    async def grade_with_feedback(
        self,
        triplet: Triplet,
        evaluator_feedback: str
    ) -> GradingResult:
        """
        Re-grade a triplet incorporating evaluator feedback.
        """
        logger.info(
            "grader_retry_with_feedback",
            grader=self.name,
            question_id=triplet.question_id,
            feedback_length=len(evaluator_feedback)
        )
        return await self._run(triplet, self._build_retry_prompt(triplet, evaluator_feedback), purpose="grade_revision")
