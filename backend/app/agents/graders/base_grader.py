"""Base grader class for specialized grading agents."""

from abc import ABC, abstractmethod
from typing import Any, Optional

import structlog

from app.core.llm_protection import protector
from app.core.llm_provider import LLMResponseError, extract_json_object, get_llm_provider
from app.schemas.grading import GradingResult, Triplet

logger = structlog.get_logger(__name__)


class GradingError(RuntimeError):
    """A grader could not produce a usable result for a question."""


class BaseGrader(ABC):
    """
    Base class for specialized grading agents.

    Uses the configured LLM provider (OpenAI or Anthropic) for grading tasks.
    """

    # Attempts per grade() call when the model returns unusable output
    MAX_PARSE_ATTEMPTS = 2

    def __init__(self):
        self.provider = get_llm_provider(role="grader")

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

    def _parse_result(self, data: dict[str, Any], triplet: Triplet) -> GradingResult:
        """Validate the model's JSON. Raises LLMResponseError if it is unusable."""
        try:
            score = float(data["score"])
        except (KeyError, TypeError, ValueError):
            raise LLMResponseError(f"Missing or non-numeric 'score': {data.get('score')!r}")

        if score < 0 or score > triplet.max_score:
            logger.warning(
                "grader_score_out_of_range",
                grader=self.name,
                question_id=triplet.question_id,
                score=score,
                max_score=triplet.max_score,
            )
            score = max(0.0, min(score, triplet.max_score))

        try:
            confidence = float(data.get("confidence", 0.5))
        except (TypeError, ValueError):
            confidence = 0.5
        confidence = max(0.0, min(confidence, 1.0))

        reasoning = str(data.get("reasoning") or "").strip()
        if not reasoning:
            raise LLMResponseError("Grader returned no reasoning")

        return GradingResult(
            question_id=triplet.question_id,
            score=score,
            max_score=triplet.max_score,
            reasoning=reasoning,
            feedback=str(data.get("feedback") or "").strip() or "No feedback provided",
            grader=self.name,
            confidence=confidence,
        )

    async def _run(self, triplet: Triplet, prompt: str) -> GradingResult:
        last_error: Optional[Exception] = None
        for attempt in range(1, self.MAX_PARSE_ATTEMPTS + 1):
            protector.check_and_increment()
            try:
                response_text = await self.provider.achat(
                    system_prompt=self.system_prompt,
                    user_prompt=prompt,
                    max_tokens=2048,
                )
                result = self._parse_result(extract_json_object(response_text), triplet)
            except LLMResponseError as e:
                last_error = e
                logger.warning(
                    "grader_unusable_response",
                    grader=self.name,
                    question_id=triplet.question_id,
                    attempt=attempt,
                    error=str(e),
                )
                continue

            logger.info(
                "grader_complete",
                grader=self.name,
                question_id=triplet.question_id,
                score=result.score,
                confidence=result.confidence,
                attempt=attempt,
            )
            return result

        # Never record a made-up score: a parse failure used to be saved as a real 0.
        raise GradingError(
            f"{self.name} could not grade question {triplet.question_id}: {last_error}"
        )

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
        return await self._run(triplet, self._build_grading_prompt(triplet))

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
        return await self._run(triplet, self._build_retry_prompt(triplet, evaluator_feedback))
