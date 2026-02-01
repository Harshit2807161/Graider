"""Orchestrator agent for routing and evaluating grading."""

from typing import Optional

import anthropic
import structlog

from ..config import get_settings
from ..models.schemas import GradingResult, Subject, Triplet
from .graders.math_grader import MathGrader
from .graders.english_grader import EnglishGrader
from .graders.science_grader import ScienceGrader
from .graders.base_grader import BaseGrader

logger = structlog.get_logger(__name__)


class Orchestrator:
    """
    Orchestrator agent that routes triplets to specialized graders
    and evaluates grading results.

    Uses Claude Opus 4.5 for routing and evaluation decisions.
    """

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_orchestrator_model

        # Initialize graders
        self.graders: dict[Subject, BaseGrader] = {
            Subject.MATH: MathGrader(),
            Subject.ENGLISH: EnglishGrader(),
            Subject.SCIENCE: ScienceGrader(),
        }

        # Default grader for unmatched subjects
        self.default_grader = EnglishGrader()

    def _get_grader(self, subject: Subject) -> BaseGrader:
        """Get the appropriate grader for a subject."""
        return self.graders.get(subject, self.default_grader)

    async def grade_triplet(self, triplet: Triplet) -> GradingResult:
        """
        Grade a single triplet using the appropriate specialized grader.

        Args:
            triplet: The question-answer-rubric triplet to grade

        Returns:
            GradingResult with score, reasoning, and feedback
        """
        logger.info(
            "orchestrator_routing",
            question_id=triplet.question_id,
            subject=triplet.subject.value,
            question_type=triplet.question_type.value
        )

        # Get appropriate grader
        grader = self._get_grader(triplet.subject)

        # Grade the triplet
        result = await grader.grade(triplet)

        # Evaluate the result (check confidence, potentially re-grade)
        if result.confidence < 0.7:
            logger.warning(
                "low_confidence_grade",
                question_id=triplet.question_id,
                confidence=result.confidence,
                grader=result.grader
            )
            # For MVP, we just log low confidence. In V1, we'd implement re-grading.

        logger.info(
            "orchestrator_result",
            question_id=triplet.question_id,
            score=result.score,
            max_score=result.max_score,
            confidence=result.confidence
        )

        return result

    async def evaluate_result(
        self,
        triplet: Triplet,
        result: GradingResult
    ) -> tuple[bool, Optional[str]]:
        """
        Evaluate a grading result for quality and consistency.

        Returns:
            Tuple of (is_acceptable, feedback_for_regrading)
        """
        # Build evaluation prompt
        prompt = f"""Evaluate this grading result for quality and consistency.

Question ({triplet.subject.value}, {triplet.question_type.value}):
{triplet.question_text}

Student Answer:
{triplet.candidate_answer}

Grading Result:
- Score: {result.score}/{result.max_score}
- Reasoning: {result.reasoning}
- Feedback: {result.feedback}
- Confidence: {result.confidence}

Expected Answer (if available):
{triplet.expected_answer.sample_answer if triplet.expected_answer else "Not provided"}

Evaluate:
1. Is the score reasonable given the answer quality?
2. Is the reasoning clear and justified?
3. Is the feedback constructive and helpful?

Respond with JSON:
{{
  "is_acceptable": true/false,
  "concerns": "Any concerns about the grading...",
  "suggested_action": "accept" or "regrade" or "adjust_score"
}}"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        # For MVP, we accept all results. Full evaluation in V1.
        return True, None


# Global instance
_orchestrator: Optional[Orchestrator] = None


def get_orchestrator() -> Orchestrator:
    """Get orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator
