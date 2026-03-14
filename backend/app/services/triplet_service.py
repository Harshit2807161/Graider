"""Triplet formation service for joining questions, answers, and rubrics."""

import json
from pathlib import Path
from typing import Optional

import structlog

from app.schemas.grading import Answer, Question, RubricCriteria, Subject, Triplet

logger = structlog.get_logger(__name__)


class TripletService:
    """Service for forming question-answer-rubric triplets."""

    def detect_subject(self, question: Question) -> Subject:
        """
        Detect the subject of a question based on its content.

        Uses simple keyword matching for MVP. Can be enhanced with
        Claude classification in V1.
        """
        text_lower = question.text.lower()

        # Math indicators
        math_keywords = [
            "calculate", "solve", "equation", "formula", "graph",
            "derivative", "integral", "algebra", "geometry", "trigonometry",
            "∫", "∑", "√", "=", "+", "-", "×", "÷", "π",
            "number", "value", "x =", "y =", "prove that"
        ]
        if any(kw in text_lower for kw in math_keywords):
            return Subject.MATH

        # Science indicators
        science_keywords = [
            "experiment", "hypothesis", "reaction", "chemical",
            "physics", "biology", "chemistry", "cell", "atom",
            "molecule", "energy", "force", "velocity", "mass",
            "photosynthesis", "evolution", "ecosystem", "organism"
        ]
        if any(kw in text_lower for kw in science_keywords):
            return Subject.SCIENCE

        # English indicators
        english_keywords = [
            "essay", "write", "describe", "explain", "analyze",
            "poem", "story", "character", "theme", "metaphor",
            "grammar", "vocabulary", "comprehension", "passage",
            "author", "literary", "narrative", "summary"
        ]
        if any(kw in text_lower for kw in english_keywords):
            return Subject.ENGLISH

        # History indicators
        history_keywords = [
            "history", "war", "revolution", "century", "empire",
            "civilization", "ancient", "medieval", "modern",
            "treaty", "independence", "political", "economic"
        ]
        if any(kw in text_lower for kw in history_keywords):
            return Subject.HISTORY

        return Subject.GENERAL

    def form_triplets(
        self,
        questions: list[Question],
        answers: list[Answer],
        rubric_criteria: Optional[list[RubricCriteria]] = None
    ) -> list[Triplet]:
        """
        Form triplets by joining questions with their answers and rubric criteria.

        Args:
            questions: List of extracted questions
            answers: List of extracted answers
            rubric_criteria: Optional list of rubric criteria

        Returns:
            List of Triplet objects ready for grading
        """
        # Create lookup maps
        answers_map = {a.question_id: a for a in answers}
        rubric_map = {}
        if rubric_criteria:
            rubric_map = {r.question_id: r for r in rubric_criteria}

        triplets = []
        unmatched_questions = []

        for question in questions:
            answer = answers_map.get(question.id)

            if not answer:
                # Try fuzzy matching (e.g., "Q1" vs "1" or "Question 1")
                for ans in answers:
                    if (
                        question.id.replace("Q", "") == ans.question_id or
                        question.id == f"Q{ans.question_id}" or
                        question.id.lower() == ans.question_id.lower()
                    ):
                        answer = ans
                        break

            if not answer:
                unmatched_questions.append(question.id)
                logger.warning(
                    "no_answer_for_question",
                    question_id=question.id,
                    message="No matching answer found"
                )
                # Create triplet with empty answer
                answer = Answer(
                    question_id=question.id,
                    text="[No answer provided]",
                    confidence=1.0
                )

            # Get rubric if available
            rubric = rubric_map.get(question.id)
            if not rubric and rubric_map:
                # Try fuzzy matching for rubric too
                # Handle cases like question.id="1" vs rubric_id="Q1"
                for rid, rcriteria in rubric_map.items():
                    if (
                        rid.replace("Q", "").replace("q", "") == question.id or
                        question.id.replace("Q", "").replace("q", "") == rid or
                        f"Q{question.id}" == rid or
                        question.id == f"Q{rid}" or
                        question.id.lower() == rid.lower()
                    ):
                        rubric = rcriteria
                        break

            # Detect subject
            subject = question.subject or self.detect_subject(question)

            triplet = Triplet(
                question_id=question.id,
                question_text=question.text,
                question_type=question.question_type,
                subject=subject,
                candidate_answer=answer.text,
                expected_answer=rubric,
                max_score=question.max_score
            )
            triplets.append(triplet)

        logger.info(
            "triplets_formed",
            total=len(triplets),
            unmatched=len(unmatched_questions),
            with_rubric=sum(1 for t in triplets if t.expected_answer is not None)
        )

        return triplets

    def save_triplets(self, triplets: list[Triplet], output_path: Path) -> None:
        """Save triplets to JSON file."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        data = [t.model_dump() for t in triplets]
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        logger.info("triplets_saved", path=str(output_path), count=len(triplets))

    def load_triplets(self, input_path: Path) -> list[Triplet]:
        """Load triplets from JSON file."""
        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [Triplet(**t) for t in data]


# Global instance
_triplet_service: Optional[TripletService] = None


def get_triplet_service() -> TripletService:
    """Get triplet service instance."""
    global _triplet_service
    if _triplet_service is None:
        _triplet_service = TripletService()
    return _triplet_service
