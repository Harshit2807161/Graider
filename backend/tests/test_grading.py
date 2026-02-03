"""Tests for grading service and agents."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

from app.models.schemas import (
    Triplet, GradingResult, Question, Answer, RubricCriteria,
    QuestionType, SubjectTag
)
from app.agents.graders.math_grader import MathGrader
from app.agents.graders.english_grader import EnglishGrader
from app.agents.graders.science_grader import ScienceGrader
from app.agents.graders.history_grader import HistoryGrader


class TestTripletModel:
    """Tests for Triplet Pydantic model."""

    @pytest.fixture
    def sample_triplet(self):
        """Create a sample triplet for testing."""
        return Triplet(
            question_id="Q1",
            question_text="Solve for x: 2x + 5 = 15",
            candidate_answer="2x + 5 = 15, 2x = 10, x = 5",
            expected_answer=RubricCriteria(
                question_id="Q1",
                expected_points=["Subtract 5", "Divide by 2", "x = 5"],
                sample_answer="x = 5",
                scoring_guide={"full": 1.0, "partial": 0.5, "minimal": 0.2}
            ),
            max_score=5,
            subject_tag=SubjectTag.MATH,
            question_type=QuestionType.PROBLEM
        )

    def test_triplet_creation(self, sample_triplet):
        """Test creating a Triplet instance."""
        assert sample_triplet.question_id == "Q1"
        assert sample_triplet.max_score == 5
        assert sample_triplet.subject_tag == SubjectTag.MATH
        assert sample_triplet.question_type == QuestionType.PROBLEM

    def test_triplet_percentage(self, sample_triplet):
        """Test triplet with calculated percentage."""
        result = GradingResult(
            question_id="Q1",
            score=4,
            max_score=5,
            reasoning="Good work",
            feedback="Keep it up",
            grader="math_grader",
            confidence=0.9
        )
        assert result.score / result.max_score == 0.8


class TestGradingResult:
    """Tests for GradingResult model."""

    def test_grading_result_creation(self):
        """Test creating a GradingResult instance."""
        result = GradingResult(
            question_id="Q1",
            score=8,
            max_score=10,
            reasoning="Student showed good understanding",
            feedback="Consider adding more detail",
            grader="science_grader",
            confidence=0.85
        )
        assert result.question_id == "Q1"
        assert result.score == 8
        assert result.max_score == 10
        assert result.confidence == 0.85

    def test_grading_result_percentage(self):
        """Test calculating percentage from result."""
        result = GradingResult(
            question_id="Q1",
            score=8,
            max_score=10,
            reasoning="Good",
            feedback="OK",
            grader="test",
            confidence=0.9
        )
        percentage = (result.score / result.max_score) * 100
        assert percentage == 80.0


class TestMathGrader:
    """Tests for MathGrader agent."""

    @pytest.fixture
    def math_grader(self):
        """Create MathGrader with mocked client."""
        with patch('app.agents.graders.base_grader.anthropic.Anthropic'):
            grader = MathGrader()
            grader.client = MagicMock()
            return grader

    @pytest.fixture
    def math_triplet(self):
        """Create a math triplet for testing."""
        return Triplet(
            question_id="Q1",
            question_text="Solve for x: 2x + 5 = 15",
            candidate_answer="2x + 5 = 15, 2x = 10, x = 5",
            expected_answer=RubricCriteria(
                question_id="Q1",
                expected_points=["Subtract 5", "Divide by 2"],
                sample_answer="x = 5",
                scoring_guide={"full": 1.0, "partial": 0.5}
            ),
            max_score=5,
            subject_tag=SubjectTag.MATH,
            question_type=QuestionType.PROBLEM
        )

    def test_math_grader_name(self, math_grader):
        """Test math grader name property."""
        assert math_grader.name == "math_grader"

    def test_math_grader_system_prompt(self, math_grader):
        """Test math grader has system prompt."""
        assert "math" in math_grader.system_prompt.lower()
        assert len(math_grader.system_prompt) > 100

    @pytest.mark.asyncio
    async def test_math_grader_grade(self, math_grader, math_triplet):
        """Test math grading."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='''
{
    "score": 5,
    "reasoning": "Correct solution with all steps shown",
    "feedback": "Excellent work!",
    "confidence": 0.95
}
''')]
        math_grader.client.messages.create.return_value = mock_response

        result = await math_grader.grade(math_triplet)

        assert result.question_id == "Q1"
        assert result.score == 5
        assert result.max_score == 5
        assert result.grader == "math_grader"
        assert result.confidence == 0.95


class TestEnglishGrader:
    """Tests for EnglishGrader agent."""

    @pytest.fixture
    def english_grader(self):
        """Create EnglishGrader with mocked client."""
        with patch('app.agents.graders.base_grader.anthropic.Anthropic'):
            grader = EnglishGrader()
            grader.client = MagicMock()
            return grader

    @pytest.fixture
    def english_triplet(self):
        """Create an English triplet for testing."""
        return Triplet(
            question_id="Q2",
            question_text="Write a short essay on the importance of education.",
            candidate_answer="Education is important because it helps people learn new skills...",
            expected_answer=RubricCriteria(
                question_id="Q2",
                expected_points=["Thesis statement", "Supporting arguments", "Examples"],
                sample_answer="Education is the foundation...",
                scoring_guide={"full": 1.0, "partial": 0.6}
            ),
            max_score=15,
            subject_tag=SubjectTag.ENGLISH,
            question_type=QuestionType.ESSAY
        )

    def test_english_grader_name(self, english_grader):
        """Test English grader name property."""
        assert english_grader.name == "english_grader"

    def test_english_grader_system_prompt(self, english_grader):
        """Test English grader has appropriate system prompt."""
        prompt = english_grader.system_prompt.lower()
        assert any(word in prompt for word in ["english", "grammar", "writing", "essay"])

    @pytest.mark.asyncio
    async def test_english_grader_grade(self, english_grader, english_triplet):
        """Test English grading."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='''
{
    "score": 12,
    "reasoning": "Good essay structure with clear thesis",
    "feedback": "Consider adding more specific examples",
    "confidence": 0.88
}
''')]
        english_grader.client.messages.create.return_value = mock_response

        result = await english_grader.grade(english_triplet)

        assert result.question_id == "Q2"
        assert result.score == 12
        assert result.max_score == 15
        assert result.grader == "english_grader"


class TestScienceGrader:
    """Tests for ScienceGrader agent."""

    @pytest.fixture
    def science_grader(self):
        """Create ScienceGrader with mocked client."""
        with patch('app.agents.graders.base_grader.anthropic.Anthropic'):
            grader = ScienceGrader()
            grader.client = MagicMock()
            return grader

    @pytest.fixture
    def science_triplet(self):
        """Create a Science triplet for testing."""
        return Triplet(
            question_id="Q3",
            question_text="Explain the process of photosynthesis.",
            candidate_answer="Photosynthesis is how plants make food using sunlight...",
            expected_answer=RubricCriteria(
                question_id="Q3",
                expected_points=["Light absorption", "CO2 and H2O", "Glucose and O2"],
                sample_answer="Photosynthesis is the process...",
                scoring_guide={"full": 1.0, "partial": 0.5}
            ),
            max_score=10,
            subject_tag=SubjectTag.SCIENCE,
            question_type=QuestionType.DESCRIPTIVE
        )

    def test_science_grader_name(self, science_grader):
        """Test Science grader name property."""
        assert science_grader.name == "science_grader"

    @pytest.mark.asyncio
    async def test_science_grader_grade(self, science_grader, science_triplet):
        """Test Science grading."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='''
{
    "score": 8,
    "reasoning": "Good understanding of core concepts",
    "feedback": "Include the chemical equation for full marks",
    "confidence": 0.92
}
''')]
        science_grader.client.messages.create.return_value = mock_response

        result = await science_grader.grade(science_triplet)

        assert result.question_id == "Q3"
        assert result.score == 8
        assert result.grader == "science_grader"


class TestHistoryGrader:
    """Tests for HistoryGrader agent."""

    @pytest.fixture
    def history_grader(self):
        """Create HistoryGrader with mocked client."""
        with patch('app.agents.graders.base_grader.anthropic.Anthropic'):
            grader = HistoryGrader()
            grader.client = MagicMock()
            return grader

    def test_history_grader_name(self, history_grader):
        """Test History grader name property."""
        assert history_grader.name == "history_grader"

    def test_history_grader_system_prompt(self, history_grader):
        """Test History grader has appropriate system prompt."""
        prompt = history_grader.system_prompt.lower()
        assert any(word in prompt for word in ["history", "historical", "events"])


class TestGraderFeedbackLoop:
    """Tests for grader feedback loop functionality."""

    @pytest.fixture
    def grader(self):
        """Create a grader with mocked client."""
        with patch('app.agents.graders.base_grader.anthropic.Anthropic'):
            grader = MathGrader()
            grader.client = MagicMock()
            return grader

    @pytest.fixture
    def triplet(self):
        """Create a triplet for testing."""
        return Triplet(
            question_id="Q1",
            question_text="What is 2+2?",
            candidate_answer="4",
            expected_answer=None,
            max_score=5,
            subject_tag=SubjectTag.MATH,
            question_type=QuestionType.SHORT_ANSWER
        )

    @pytest.mark.asyncio
    async def test_grade_with_feedback(self, grader, triplet):
        """Test grading with evaluator feedback."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='''
{
    "score": 5,
    "reasoning": "Correct answer with improved explanation",
    "feedback": "Well done!",
    "confidence": 0.98
}
''')]
        grader.client.messages.create.return_value = mock_response

        feedback = "Please provide more detailed reasoning for your score."
        result = await grader.grade_with_feedback(triplet, feedback)

        assert result.score == 5
        assert result.confidence == 0.98
        # Verify the feedback was included in the prompt
        call_args = grader.client.messages.create.call_args
        assert feedback in str(call_args)


class TestScoreBounds:
    """Tests for score boundary handling."""

    @pytest.fixture
    def grader(self):
        """Create a grader with mocked client."""
        with patch('app.agents.graders.base_grader.anthropic.Anthropic'):
            grader = MathGrader()
            grader.client = MagicMock()
            return grader

    @pytest.fixture
    def triplet(self):
        """Create a triplet for testing."""
        return Triplet(
            question_id="Q1",
            question_text="Test",
            candidate_answer="Test",
            expected_answer=None,
            max_score=10,
            subject_tag=SubjectTag.MATH,
            question_type=QuestionType.SHORT_ANSWER
        )

    @pytest.mark.asyncio
    async def test_score_capped_at_max(self, grader, triplet):
        """Test that scores above max are capped."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='''
{
    "score": 15,
    "reasoning": "Perfect",
    "feedback": "Great",
    "confidence": 0.9
}
''')]
        grader.client.messages.create.return_value = mock_response

        result = await grader.grade(triplet)
        assert result.score == 10  # Capped at max_score

    @pytest.mark.asyncio
    async def test_score_minimum_zero(self, grader, triplet):
        """Test that negative scores are set to zero."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='''
{
    "score": -5,
    "reasoning": "Bad",
    "feedback": "Try again",
    "confidence": 0.9
}
''')]
        grader.client.messages.create.return_value = mock_response

        result = await grader.grade(triplet)
        assert result.score == 0  # Minimum is 0


class TestGraderErrorHandling:
    """Tests for grader error handling."""

    @pytest.fixture
    def grader(self):
        """Create a grader with mocked client."""
        with patch('app.agents.graders.base_grader.anthropic.Anthropic'):
            grader = MathGrader()
            grader.client = MagicMock()
            return grader

    @pytest.fixture
    def triplet(self):
        """Create a triplet for testing."""
        return Triplet(
            question_id="Q1",
            question_text="Test",
            candidate_answer="Test",
            expected_answer=None,
            max_score=10,
            subject_tag=SubjectTag.MATH,
            question_type=QuestionType.SHORT_ANSWER
        )

    @pytest.mark.asyncio
    async def test_invalid_json_response(self, grader, triplet):
        """Test handling of invalid JSON response."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="This is not valid JSON")]
        grader.client.messages.create.return_value = mock_response

        result = await grader.grade(triplet)

        # Should return default error result
        assert result.score == 0
        assert result.confidence == 0.0
        assert "error" in result.reasoning.lower() or "parse" in result.reasoning.lower()
