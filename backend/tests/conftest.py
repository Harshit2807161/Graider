"""Pytest configuration and shared fixtures."""

import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def mock_anthropic_client():
    """Create a mocked Anthropic client."""
    with patch('anthropic.Anthropic') as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def sample_question_json():
    """Sample question JSON from OCR."""
    return {
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
            },
            {
                "id": "Q3",
                "text": "Write a short essay on the importance of education.",
                "max_score": 15
            }
        ]
    }


@pytest.fixture
def sample_answer_json():
    """Sample answer JSON from OCR."""
    return {
        "answers": [
            {
                "question_id": "Q1",
                "text": "2x + 5 = 15\n2x = 10\nx = 5"
            },
            {
                "question_id": "Q2",
                "text": "Photosynthesis is the process by which plants convert light energy into chemical energy. It occurs in chloroplasts."
            },
            {
                "question_id": "Q3",
                "text": "Education is very important in our lives. It helps us learn new things and develop skills."
            }
        ]
    }


@pytest.fixture
def sample_rubric_json():
    """Sample rubric JSON."""
    return {
        "criteria": [
            {
                "question_id": "Q1",
                "expected_points": ["Subtract 5 from both sides", "Divide by 2", "x = 5"],
                "sample_answer": "x = 5",
                "scoring_guide": {"full": 1.0, "partial": 0.5, "minimal": 0.2}
            },
            {
                "question_id": "Q2",
                "expected_points": [
                    "Light absorption by chlorophyll",
                    "Water and CO2 as inputs",
                    "Glucose and O2 as outputs",
                    "Location in chloroplasts"
                ],
                "sample_answer": "Photosynthesis is the process by which plants convert light energy...",
                "scoring_guide": {"full": 1.0, "partial": 0.6, "minimal": 0.2}
            },
            {
                "question_id": "Q3",
                "expected_points": [
                    "Thesis statement",
                    "Supporting arguments",
                    "Examples and evidence",
                    "Structure and organization"
                ],
                "sample_answer": "Education is the foundation of personal and societal development...",
                "scoring_guide": {"full": 1.0, "partial": 0.5, "minimal": 0.2}
            }
        ]
    }


@pytest.fixture
def sample_grading_response():
    """Sample grading response from Claude."""
    return {
        "score": 8,
        "reasoning": "Student demonstrated good understanding of the core concepts.",
        "feedback": "Consider adding more specific examples to strengthen your answer.",
        "confidence": 0.92
    }


@pytest.fixture
def fixtures_path():
    """Path to test fixtures directory."""
    return Path(__file__).parent / "fixtures"
