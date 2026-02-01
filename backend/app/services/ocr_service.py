"""OCR service using Claude Vision API."""

import base64
import json
from pathlib import Path
from typing import Optional

import anthropic
import structlog

from ..config import get_settings
from ..models.schemas import Answer, Question, QuestionType, RubricCriteria

logger = structlog.get_logger(__name__)


class OCRService:
    """Service for extracting text from images using Claude Vision."""

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.vision_model = settings.claude_vision_model

    def _encode_image(self, image_path: Path) -> tuple[str, str]:
        """Encode image to base64 and determine media type."""
        suffix = image_path.suffix.lower()
        media_type_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        media_type = media_type_map.get(suffix, "image/jpeg")

        with open(image_path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        return image_data, media_type

    def _build_image_content(self, image_paths: list[Path]) -> list[dict]:
        """Build content array with all images."""
        content = []
        for path in image_paths:
            image_data, media_type = self._encode_image(path)
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": image_data,
                }
            })
        return content

    async def extract_questions(self, images_dir: Path) -> list[Question]:
        """
        Extract questions from question paper images.

        Args:
            images_dir: Directory containing question paper images

        Returns:
            List of extracted Question objects
        """
        image_paths = sorted(images_dir.glob("*"))
        image_paths = [p for p in image_paths if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}]

        if not image_paths:
            logger.error("no_question_images", dir=str(images_dir))
            return []

        content = self._build_image_content(image_paths)
        content.append({
            "type": "text",
            "text": """Analyze these question paper images and extract ALL questions.

For each question, provide:
1. id: The question number/identifier (e.g., "Q1", "Q2a", "Q2b")
2. text: The complete question text
3. max_score: The maximum marks/points for this question (look for marks in brackets or after the question)
4. question_type: One of "descriptive", "problem", "mcq", "short_answer", "essay"

Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "id": "Q1",
      "text": "What is photosynthesis? Explain the process in detail.",
      "max_score": 10,
      "question_type": "descriptive"
    }
  ]
}

Important:
- Extract ALL questions visible in the images
- Preserve the exact question text including any sub-parts
- If marks are not visible, estimate based on question complexity (short answer: 2-5, descriptive: 5-10, essay: 10-20)
- For MCQs, include all options in the text

Return ONLY the JSON object, no other text."""
        })

        logger.info("ocr_questions_start", image_count=len(image_paths))

        response = self.client.messages.create(
            model=self.vision_model,
            max_tokens=4096,
            messages=[{"role": "user", "content": content}]
        )

        # Parse response
        response_text = response.content[0].text.strip()

        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        try:
            data = json.loads(response_text)
            questions = []
            for q in data.get("questions", []):
                questions.append(Question(
                    id=q["id"],
                    text=q["text"],
                    max_score=float(q.get("max_score", 5)),
                    question_type=QuestionType(q.get("question_type", "descriptive"))
                ))
            logger.info("ocr_questions_complete", question_count=len(questions))
            return questions
        except json.JSONDecodeError as e:
            logger.error("ocr_questions_parse_error", error=str(e), response=response_text[:500])
            return []

    async def extract_answers(self, images_dir: Path, questions: list[Question]) -> list[Answer]:
        """
        Extract answers from student answer sheet images.

        Args:
            images_dir: Directory containing answer sheet images
            questions: List of questions to match answers to

        Returns:
            List of extracted Answer objects
        """
        image_paths = sorted(images_dir.glob("*"))
        image_paths = [p for p in image_paths if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}]

        if not image_paths:
            logger.error("no_answer_images", dir=str(images_dir))
            return []

        # Build question context for better extraction
        question_context = "\n".join([f"- {q.id}: {q.text[:100]}..." for q in questions])

        content = self._build_image_content(image_paths)
        content.append({
            "type": "text",
            "text": f"""Analyze these student answer sheet images and extract ALL answers.

The questions being answered are:
{question_context}

For each answer found, provide:
1. question_id: Match to the corresponding question ID from above
2. text: The complete answer text (transcribe handwriting carefully)
3. confidence: Your confidence in the transcription accuracy (0.0 to 1.0)

Return your response as a JSON object with this exact structure:
{{
  "answers": [
    {{
      "question_id": "Q1",
      "text": "Photosynthesis is the process by which plants convert sunlight into energy...",
      "confidence": 0.95
    }}
  ]
}}

Important:
- Transcribe handwritten text as accurately as possible
- If handwriting is unclear, make your best interpretation and lower confidence
- Match answers to the correct question IDs
- Include partial or incomplete answers
- If an answer is blank or missing, you can omit it or note "No answer provided"

Return ONLY the JSON object, no other text."""
        })

        logger.info("ocr_answers_start", image_count=len(image_paths))

        response = self.client.messages.create(
            model=self.vision_model,
            max_tokens=8192,
            messages=[{"role": "user", "content": content}]
        )

        # Parse response
        response_text = response.content[0].text.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        try:
            data = json.loads(response_text)
            answers = []
            for a in data.get("answers", []):
                answers.append(Answer(
                    question_id=a["question_id"],
                    text=a["text"],
                    confidence=float(a.get("confidence", 1.0))
                ))
            logger.info("ocr_answers_complete", answer_count=len(answers))
            return answers
        except json.JSONDecodeError as e:
            logger.error("ocr_answers_parse_error", error=str(e), response=response_text[:500])
            return []

    async def extract_rubric(self, rubric_dir: Path) -> list[RubricCriteria]:
        """
        Extract grading criteria from rubric files.

        Args:
            rubric_dir: Directory containing rubric files (text or images)

        Returns:
            List of RubricCriteria objects
        """
        rubric_paths = sorted(rubric_dir.glob("*"))

        # Separate text and image files
        text_files = [p for p in rubric_paths if p.suffix.lower() in {".txt", ".json", ".md"}]
        image_files = [p for p in rubric_paths if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}]

        content = []

        # Add text file contents
        for text_file in text_files:
            text_content = text_file.read_text(encoding="utf-8")
            content.append({
                "type": "text",
                "text": f"Rubric file ({text_file.name}):\n{text_content}\n---"
            })

        # Add images
        if image_files:
            content.extend(self._build_image_content(image_files))

        if not content:
            logger.warning("no_rubric_files", dir=str(rubric_dir))
            return []

        content.append({
            "type": "text",
            "text": """Analyze the rubric content above and extract grading criteria for each question.

For each question, provide:
1. question_id: The question identifier
2. expected_points: Key points/concepts that should be in the answer
3. sample_answer: A model answer if provided
4. scoring_guide: How to allocate marks (full, partial, minimal)

Return as JSON:
{
  "criteria": [
    {
      "question_id": "Q1",
      "expected_points": ["point 1", "point 2", "point 3"],
      "sample_answer": "Full model answer here...",
      "scoring_guide": {"full": 1.0, "partial": 0.5, "minimal": 0.2}
    }
  ]
}

Return ONLY the JSON object."""
        })

        logger.info("ocr_rubric_start", text_count=len(text_files), image_count=len(image_files))

        response = self.client.messages.create(
            model=self.vision_model,
            max_tokens=4096,
            messages=[{"role": "user", "content": content}]
        )

        response_text = response.content[0].text.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        try:
            data = json.loads(response_text)
            criteria = []
            for c in data.get("criteria", []):
                criteria.append(RubricCriteria(
                    question_id=c["question_id"],
                    expected_points=c.get("expected_points", []),
                    sample_answer=c.get("sample_answer"),
                    scoring_guide=c.get("scoring_guide", {"full": 1.0, "partial": 0.5, "minimal": 0.2})
                ))
            logger.info("ocr_rubric_complete", criteria_count=len(criteria))
            return criteria
        except json.JSONDecodeError as e:
            logger.error("ocr_rubric_parse_error", error=str(e), response=response_text[:500])
            return []


# Global instance
_ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    """Get OCR service instance."""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service
