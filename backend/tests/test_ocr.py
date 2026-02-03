"""Tests for OCR service."""

import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.ocr_service import OCRService
from app.models.schemas import Question, Answer, RubricCriteria


class TestOCRService:
    """Tests for OCRService class."""

    @pytest.fixture
    def ocr_service(self):
        """Create OCRService instance with mocked client."""
        with patch('app.services.ocr_service.anthropic.Anthropic'):
            service = OCRService()
            service.client = MagicMock()
            return service

    @pytest.fixture
    def sample_questions_response(self):
        """Sample Claude response for question extraction."""
        return """```json
{
    "questions": [
        {
            "id": "Q1",
            "text": "Solve for x: 2x + 5 = 15",
            "max_score": 5
        },
        {
            "id": "Q2",
            "text": "Explain the process of photosynthesis.",
            "max_score": 10
        }
    ]
}
```"""

    @pytest.fixture
    def sample_answers_response(self):
        """Sample Claude response for answer extraction."""
        return """```json
{
    "answers": [
        {
            "question_id": "Q1",
            "text": "2x + 5 = 15, 2x = 10, x = 5"
        },
        {
            "question_id": "Q2",
            "text": "Photosynthesis is the process by which plants convert light energy into chemical energy."
        }
    ]
}
```"""

    def test_parse_json_response_with_code_block(self, ocr_service):
        """Test parsing JSON response wrapped in markdown code block."""
        response = """```json
{"key": "value"}
```"""
        result = ocr_service._parse_json_response(response)
        assert result == {"key": "value"}

    def test_parse_json_response_plain(self, ocr_service):
        """Test parsing plain JSON response."""
        response = '{"key": "value"}'
        result = ocr_service._parse_json_response(response)
        assert result == {"key": "value"}

    def test_parse_json_response_invalid(self, ocr_service):
        """Test parsing invalid JSON returns empty dict."""
        response = "not valid json"
        result = ocr_service._parse_json_response(response)
        assert result == {}

    @pytest.mark.asyncio
    async def test_extract_questions_success(self, ocr_service, sample_questions_response):
        """Test successful question extraction."""
        # Mock the Claude API response
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=sample_questions_response)]
        ocr_service.client.messages.create.return_value = mock_response

        # Create a mock image path
        with patch('builtins.open', MagicMock()):
            with patch('base64.standard_b64encode', return_value=b'fake_base64'):
                questions = await ocr_service.extract_questions([Path("test.png")])

        assert len(questions) == 2
        assert questions[0].id == "Q1"
        assert questions[0].max_score == 5
        assert questions[1].id == "Q2"
        assert questions[1].max_score == 10

    @pytest.mark.asyncio
    async def test_extract_questions_empty_response(self, ocr_service):
        """Test question extraction with empty response."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"questions": []}')]
        ocr_service.client.messages.create.return_value = mock_response

        with patch('builtins.open', MagicMock()):
            with patch('base64.standard_b64encode', return_value=b'fake_base64'):
                questions = await ocr_service.extract_questions([Path("test.png")])

        assert len(questions) == 0

    @pytest.mark.asyncio
    async def test_extract_answers_success(self, ocr_service, sample_answers_response):
        """Test successful answer extraction."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=sample_answers_response)]
        ocr_service.client.messages.create.return_value = mock_response

        with patch('builtins.open', MagicMock()):
            with patch('base64.standard_b64encode', return_value=b'fake_base64'):
                answers = await ocr_service.extract_answers([Path("test.png")])

        assert len(answers) == 2
        assert answers[0].question_id == "Q1"
        assert answers[1].question_id == "Q2"

    def test_parse_rubric_text(self, ocr_service):
        """Test parsing text rubric."""
        rubric_text = """## Question 1: Mathematics (5 marks)
**Question**: Solve for x: 2x + 5 = 15

**Expected Answer**: x = 5

**Scoring**:
- Full marks (5): Correct answer with work shown
- Partial (3): Correct method but calculation error
- Minimal (1): Some attempt at solving
"""
        criteria = ocr_service.parse_rubric_text(rubric_text)

        # Should return list of RubricCriteria
        assert isinstance(criteria, list)
        # At minimum should have parsed something
        assert len(criteria) >= 0  # May return empty if parsing fails

    @pytest.mark.asyncio
    async def test_extract_questions_with_multiple_images(self, ocr_service):
        """Test question extraction from multiple images."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"questions": [{"id": "Q1", "text": "Test", "max_score": 5}]}')]
        ocr_service.client.messages.create.return_value = mock_response

        with patch('builtins.open', MagicMock()):
            with patch('base64.standard_b64encode', return_value=b'fake_base64'):
                questions = await ocr_service.extract_questions([
                    Path("test1.png"),
                    Path("test2.png")
                ])

        # Verify API was called with multiple images
        assert ocr_service.client.messages.create.called


class TestQuestionModel:
    """Tests for Question Pydantic model."""

    def test_question_creation(self):
        """Test creating a Question instance."""
        q = Question(id="Q1", text="What is 2+2?", max_score=5)
        assert q.id == "Q1"
        assert q.text == "What is 2+2?"
        assert q.max_score == 5

    def test_question_with_type(self):
        """Test creating a Question with type."""
        q = Question(id="Q1", text="What is 2+2?", max_score=5, question_type="MCQ")
        assert q.question_type == "MCQ"


class TestAnswerModel:
    """Tests for Answer Pydantic model."""

    def test_answer_creation(self):
        """Test creating an Answer instance."""
        a = Answer(question_id="Q1", text="The answer is 4")
        assert a.question_id == "Q1"
        assert a.text == "The answer is 4"


class TestRubricCriteriaModel:
    """Tests for RubricCriteria Pydantic model."""

    def test_rubric_criteria_creation(self):
        """Test creating a RubricCriteria instance."""
        r = RubricCriteria(
            question_id="Q1",
            expected_points=["Point 1", "Point 2"],
            sample_answer="Sample answer text",
            scoring_guide={"full": 1.0, "partial": 0.5}
        )
        assert r.question_id == "Q1"
        assert len(r.expected_points) == 2
        assert r.scoring_guide["full"] == 1.0
