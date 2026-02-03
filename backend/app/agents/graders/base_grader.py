"""Base grader class for specialized grading agents."""

import json
from abc import ABC, abstractmethod
from typing import Optional

import anthropic
import structlog

from ...config import get_settings
from ...models.schemas import GradingResult, Triplet

logger = structlog.get_logger(__name__)


class BaseGrader(ABC):
    """
    Base class for specialized grading agents.

    Uses Claude Sonnet 4 for grading tasks.
    """

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_grader_model

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

    def _build_grading_prompt(self, triplet: Triplet) -> str:
        """Build the grading prompt for a triplet."""
        rubric_section = ""
        if triplet.expected_answer:
            rubric_section = f"""
Expected Points to Cover:
{chr(10).join(f"- {point}" for point in triplet.expected_answer.expected_points)}

Sample Answer:
{triplet.expected_answer.sample_answer or "Not provided"}

Scoring Guide:
- Full marks: {triplet.expected_answer.scoring_guide.get('full', 1.0) * 100}% of max score
- Partial marks: {triplet.expected_answer.scoring_guide.get('partial', 0.5) * 100}% of max score
- Minimal marks: {triplet.expected_answer.scoring_guide.get('minimal', 0.2) * 100}% of max score
"""

        return f"""Grade the following student answer.

Question ({triplet.question_type.value}):
{triplet.question_text}

Maximum Score: {triplet.max_score} points

Student's Answer:
{triplet.candidate_answer}

{rubric_section}

Provide your grading as a JSON object with these fields:
{{
  "score": <numeric score between 0 and {triplet.max_score}>,
  "reasoning": "<detailed explanation of how you arrived at this score>",
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

    async def grade(self, triplet: Triplet) -> GradingResult:
        """
        Grade a triplet and return the result.

        Args:
            triplet: The question-answer-rubric triplet to grade

        Returns:
            GradingResult with score, reasoning, and feedback
        """
        prompt = self._build_grading_prompt(triplet)

        logger.info(
            "grader_start",
            grader=self.name,
            question_id=triplet.question_id,
            max_score=triplet.max_score
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = response.content[0].text.strip()

        # Handle markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        try:
            data = json.loads(response_text)

            # Ensure score is within bounds
            score = float(data.get("score", 0))
            score = max(0, min(score, triplet.max_score))

            result = GradingResult(
                question_id=triplet.question_id,
                score=score,
                max_score=triplet.max_score,
                reasoning=data.get("reasoning", "No reasoning provided"),
                feedback=data.get("feedback", "No feedback provided"),
                grader=self.name,
                confidence=float(data.get("confidence", 0.8))
            )

            logger.info(
                "grader_complete",
                grader=self.name,
                question_id=triplet.question_id,
                score=result.score,
                confidence=result.confidence
            )

            return result

        except json.JSONDecodeError as e:
            logger.error(
                "grader_parse_error",
                grader=self.name,
                question_id=triplet.question_id,
                error=str(e),
                response=response_text[:500]
            )
            # Return a default result on parse error
            return GradingResult(
                question_id=triplet.question_id,
                score=0,
                max_score=triplet.max_score,
                reasoning="Error parsing grader response",
                feedback="Please review this answer manually",
                grader=self.name,
                confidence=0.0
            )

    async def grade_with_feedback(
        self,
        triplet: Triplet,
        evaluator_feedback: str
    ) -> GradingResult:
        """
        Re-grade a triplet incorporating evaluator feedback.

        This method is called when the orchestrator's evaluator rejects
        a previous grading attempt and provides improvement suggestions.

        Args:
            triplet: The question-answer-rubric triplet to grade
            evaluator_feedback: Feedback from the evaluator on how to improve

        Returns:
            GradingResult with improved score, reasoning, and feedback
        """
        base_prompt = self._build_grading_prompt(triplet)

        enhanced_prompt = f"""{base_prompt}

IMPORTANT - Previous Grading Feedback:
Your previous grading was reviewed and needs improvement. The evaluator provided this feedback:

"{evaluator_feedback}"

Please carefully consider this feedback and provide an improved grading that:
1. Addresses the specific concerns raised
2. Provides more detailed reasoning grounded in the rubric
3. Offers more specific and actionable feedback to the student
4. Reflects appropriate confidence in your assessment

Return ONLY the JSON object with your improved grading."""

        logger.info(
            "grader_retry_with_feedback",
            grader=self.name,
            question_id=triplet.question_id,
            feedback_length=len(evaluator_feedback)
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=self.system_prompt,
            messages=[{"role": "user", "content": enhanced_prompt}]
        )

        response_text = response.content[0].text.strip()

        # Handle markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        try:
            data = json.loads(response_text)

            # Ensure score is within bounds
            score = float(data.get("score", 0))
            score = max(0, min(score, triplet.max_score))

            result = GradingResult(
                question_id=triplet.question_id,
                score=score,
                max_score=triplet.max_score,
                reasoning=data.get("reasoning", "No reasoning provided"),
                feedback=data.get("feedback", "No feedback provided"),
                grader=self.name,
                confidence=float(data.get("confidence", 0.8))
            )

            logger.info(
                "grader_retry_complete",
                grader=self.name,
                question_id=triplet.question_id,
                score=result.score,
                confidence=result.confidence
            )

            return result

        except json.JSONDecodeError as e:
            logger.error(
                "grader_retry_parse_error",
                grader=self.name,
                question_id=triplet.question_id,
                error=str(e),
                response=response_text[:500]
            )
            # Return a default result on parse error
            return GradingResult(
                question_id=triplet.question_id,
                score=0,
                max_score=triplet.max_score,
                reasoning="Error parsing grader response on retry",
                feedback="Please review this answer manually",
                grader=self.name,
                confidence=0.0
            )
