"""OCR service using Claude Vision API."""

import base64
import json
from pathlib import Path
from typing import Optional

import structlog

from app.core.config import get_settings
from app.core.llm_protection import protector
from app.core.llm_provider import LLMResponseError, extract_json_object, get_llm_provider
from app.schemas.grading import Answer, Question, QuestionType, RubricCriteria, Subject, Triplet
from .pdf_service import process_directory_files_async, get_pdf_service

logger = structlog.get_logger(__name__)

# Maximum number of images to send in a single API request
MAX_IMAGES_PER_REQUEST = 10


class OCRError(RuntimeError):
    """Answer sheets could not be transcribed."""


class OCRService:
    """Service for extracting text from images and PDFs using Claude Vision."""

    def __init__(self):
        settings = get_settings()
        self.provider = get_llm_provider(role="vision")
        self.pdf_service = get_pdf_service()

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
            if not path.exists():
                logger.warning("image_not_found", path=str(path))
                continue
            try:
                image_data, media_type = self._encode_image(path)
                content.append({
                    "type": "image",
                    "data": image_data,
                    "media_type": media_type
                })
            except Exception as e:
                logger.error("image_encode_error", path=str(path), error=str(e))
        return content

    def _parse_json_response(self, response_text: str) -> dict:
        """Parse JSON from Claude response, handling markdown code blocks."""
        text = response_text.strip()

        # Handle markdown code blocks
        if text.startswith("```"):
            parts = text.split("```")
            if len(parts) >= 2:
                text = parts[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error("json_parse_error", error=str(e), response=text[:500])
            return {}

    async def _call_vision_api(self, content: list[dict], max_tokens: int = 8192) -> str:
        """
        Send images + instructions to the vision model.

        The last text block is used as the instruction prompt; everything else is content.
        """
        prompt = ""
        content_blocks = list(content)
        if content_blocks and content_blocks[-1]["type"] == "text":
            prompt = content_blocks.pop()["text"]

        logger.info(
            "vision_api_call_start",
            content_items=len(content_blocks),
            image_count=sum(1 for c in content_blocks if c.get("type") == "image"),
            max_tokens=max_tokens,
        )
        protector.check_and_increment()
        try:
            response_text = await self.provider.achat_vision(
                prompt=prompt or "Extract text from these images.",
                content_blocks=content_blocks,
                max_tokens=max_tokens,
            )
        except Exception as e:
            # Previously a "request too large" error silently retried with half the pages,
            # dropping the rest of the answer sheet. Fail loudly instead; callers batch pages.
            logger.error("vision_api_call_failed", error=str(e), error_type=type(e).__name__)
            raise

        logger.info("vision_api_call_success")
        return response_text

    async def _prepare_directory_content(self, directory: Path) -> tuple[list[dict], list[str]]:
        """
        Prepare content from a directory, handling both images and PDFs.

        Returns:
            Tuple of (image content for Claude, list of extracted texts)
        """
        logger.info("prepare_directory_start", directory=str(directory))

        # Process all files, converting PDFs to images (async to avoid blocking)
        image_paths, text_contents = await process_directory_files_async(directory)

        logger.info(
            "prepare_directory_files_processed",
            directory=str(directory),
            image_count=len(image_paths),
            text_count=len(text_contents),
            image_paths=[str(p) for p in image_paths[:5]]  # Log first 5 for debugging
        )

        # Build image content
        image_content = self._build_image_content(image_paths)

        logger.info(
            "prepare_directory_complete",
            directory=str(directory),
            image_content_count=len(image_content),
            text_content_count=len(text_contents)
        )

        return image_content, text_contents

    async def extract_questions(self, images_dir: Path) -> list[Question]:
        """
        Extract questions from question paper files (images or PDFs).

        Args:
            images_dir: Directory containing question paper files

        Returns:
            List of extracted Question objects
        """
        image_content, text_contents = await self._prepare_directory_content(images_dir)

        if not image_content and not text_contents:
            logger.error("no_question_files", dir=str(images_dir))
            return []

        content = []

        # Add any extracted text from PDFs
        if text_contents:
            combined_text = "\n\n---\n\n".join(text_contents)
            content.append({
                "type": "text",
                "text": f"Extracted text from documents:\n\n{combined_text}\n\n---"
            })

        # Add images
        content.extend(image_content)

        # Add extraction prompt
        content.append({
            "type": "text",
            "text": """Analyze these question paper documents and extract ALL questions.

The documents may contain:
- Printed text (typed questions)
- Handwritten text (if any)
- A mix of both printed and handwritten content

For each question, provide:
1. id: The question number/identifier (e.g., "Q1", "Q2a", "Q2b", "1", "1a")
2. text: The complete question text
3. max_score: The maximum marks/points for this question (look for marks in brackets like [5], (5 marks), etc.)
4. question_type: One of "descriptive", "problem", "mcq", "short_answer", "essay", "assertion_reasoning", "differentiate", "elucidate"

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
- Extract ALL questions visible in the documents
- Preserve the exact question text including any sub-parts (a, b, c, etc.)
- Look carefully for marks - they may be in brackets [5], parentheses (5 marks), or written as "5M"
- If marks are not visible, estimate based on question complexity:
  * MCQ: 1-2 marks
  * Short answer: 2-5 marks
  * Descriptive: 5-10 marks
  * Essay: 10-20 marks
- For MCQs, include all options (A, B, C, D) in the text
- Handle both printed and handwritten questions

Return ONLY the JSON object, no other text."""
        })

        logger.info("ocr_questions_start", image_count=len(image_content), text_count=len(text_contents))

        response_text = await self._call_vision_api(content, max_tokens=8192)

        data = self._parse_json_response(response_text)

        questions = []
        for q in data.get("questions", []):
            try:
                # Normalize question type
                q_type = q.get("question_type", "descriptive").lower().replace("-", "_").replace(" ", "_")
                try:
                    question_type = QuestionType(q_type)
                except ValueError:
                    question_type = QuestionType.DESCRIPTIVE

                questions.append(Question(
                    id=str(q["id"]),
                    text=q["text"],
                    max_score=float(q.get("max_score", 5)),
                    question_type=question_type
                ))
            except Exception as e:
                logger.error("question_parse_error", question=q, error=str(e))

        logger.info("ocr_questions_complete", question_count=len(questions))
        return questions

    async def extract_answers(self, images_dir: Path, questions: list[Question]) -> list[Answer]:
        """
        Extract answers from student answer sheet files (images or PDFs).

        Args:
            images_dir: Answer sheet file, or a directory of them
            questions: Questions to match answers to. Their `id`s should be short labels
                like "Q1" that the model can echo back reliably (not database UUIDs).

        Returns:
            One Answer per question id the model found, in question order.

        Raises:
            OCRError: if the files can't be read or the model response is unusable.
        """
        image_content, text_contents = await self._prepare_directory_content(images_dir)

        if not image_content and not text_contents:
            raise OCRError(f"No readable pages found in {images_dir}")

        valid_ids = [q.id for q in questions]
        question_context = "\n".join(
            f"- {q.id}: {q.text[:150]}..." if len(q.text) > 150 else f"- {q.id}: {q.text}"
            for q in questions
        )

        # Large answer sheets are sent in page batches; answers that continue across
        # batches are stitched back together below.
        batches = [
            image_content[i:i + MAX_IMAGES_PER_REQUEST]
            for i in range(0, len(image_content), MAX_IMAGES_PER_REQUEST)
        ] or [[]]
        total_pages = len(image_content)

        merged: dict[str, Answer] = {}
        for batch_index, batch in enumerate(batches):
            first_page = batch_index * MAX_IMAGES_PER_REQUEST + 1
            content: list[dict] = []

            # Embedded PDF text (typed documents) only needs to be sent once
            if text_contents and batch_index == 0:
                combined_text = "\n\n---\n\n".join(text_contents)
                content.append({
                    "type": "text",
                    "text": f"Extracted text from documents:\n\n{combined_text}\n\n---"
                })
            content.extend(batch)

            page_note = ""
            if len(batches) > 1:
                page_note = (
                    f"\nThese images are pages {first_page}-{first_page + len(batch) - 1} "
                    f"of a {total_pages}-page answer sheet. Only extract answers visible on these pages; "
                    "omit questions that don't appear here.\n"
                )

            content.append({
                "type": "text",
                "text": f"""Analyze these student answer sheet documents and extract ALL answers.
{page_note}
The documents may contain:
- Handwritten answers (most common)
- Printed/typed answers
- A mix of both
- Mathematical equations, diagrams, or formulas

The questions being answered are:
{question_context}

For each answer found, provide:
1. question_id: EXACTLY one of these ids: {", ".join(valid_ids)}
2. text: The complete answer text (transcribe handwriting carefully, include all work shown)
3. confidence: Your confidence in the transcription accuracy (0.0 to 1.0)

Return your response as a JSON object with this exact structure:
{{
  "answers": [
    {{
      "question_id": "{valid_ids[0] if valid_ids else 'Q1'}",
      "text": "Photosynthesis is the process by which plants convert sunlight into energy...",
      "confidence": 0.95
    }}
  ]
}}

Important:
- Transcribe handwritten text as accurately as possible
- For mathematical work, include all steps and calculations
- If handwriting is unclear, make your best interpretation and lower confidence
- Students may not write the question number exactly; match by position/context and use the ids above
- Include partial or incomplete answers
- Look for answer numbers that may be written as "1.", "1)", "Ans 1:", etc.

Return ONLY the JSON object, no other text."""
            })

            logger.info(
                "ocr_answers_start",
                batch=batch_index + 1,
                batches=len(batches),
                image_count=len(batch),
                text_count=len(text_contents),
            )

            response_text = await self._call_vision_api(content, max_tokens=16384)
            try:
                data = extract_json_object(response_text)
            except LLMResponseError as e:
                raise OCRError(f"Could not parse answer transcription: {e}") from e
            if not isinstance(data.get("answers"), list):
                raise OCRError("Answer transcription is missing the 'answers' list")

            for a in data["answers"]:
                try:
                    answer = Answer(
                        question_id=str(a["question_id"]).strip(),
                        text=str(a["text"]),
                        confidence=float(a.get("confidence", 1.0)),
                    )
                except (KeyError, TypeError, ValueError) as e:
                    logger.error("answer_parse_error", answer=a, error=str(e))
                    continue

                previous = merged.get(answer.question_id)
                if previous is None:
                    merged[answer.question_id] = answer
                else:
                    merged[answer.question_id] = Answer(
                        question_id=answer.question_id,
                        text=f"{previous.text}\n{answer.text}",
                        confidence=min(previous.confidence, answer.confidence),
                    )

        unknown = sorted(set(merged) - set(valid_ids))
        if unknown:
            logger.warning("ocr_unknown_question_ids", ids=unknown)

        answers = list(merged.values())
        logger.info("ocr_answers_complete", answer_count=len(answers))
        return answers

    async def extract_questions_and_answers(self, images_dir: Path) -> tuple[list[Question], list[Answer]]:
        """
        Extract both questions AND answers from a combined document.

        Use this when a single PDF/image contains both the question paper
        and student answers together.

        Args:
            images_dir: Directory containing combined document files

        Returns:
            Tuple of (questions, answers)
        """
        image_content, text_contents = await self._prepare_directory_content(images_dir)

        if not image_content and not text_contents:
            logger.error("no_combined_files", dir=str(images_dir))
            return [], []

        content = []

        # Add any extracted text from PDFs
        if text_contents:
            combined_text = "\n\n---\n\n".join(text_contents)
            content.append({
                "type": "text",
                "text": f"Extracted text from documents:\n\n{combined_text}\n\n---"
            })

        # Add images
        content.extend(image_content)

        content.append({
            "type": "text",
            "text": """Analyze these documents which contain BOTH questions AND student answers together.

The documents may have:
- Questions printed/typed with answers written below them
- A question paper section followed by an answer section
- Questions and answers interleaved
- Mixed handwritten and printed text

Extract BOTH the questions AND the corresponding student answers.

Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "id": "Q1",
      "text": "What is photosynthesis?",
      "max_score": 10,
      "question_type": "descriptive"
    }
  ],
  "answers": [
    {
      "question_id": "Q1",
      "text": "Photosynthesis is the process by which plants...",
      "confidence": 0.9
    }
  ]
}

For questions:
- id: Question identifier (Q1, 1, 1a, etc.)
- text: The complete question text
- max_score: Marks for the question (look for [5], (5 marks), 5M, etc.)
- question_type: One of "descriptive", "problem", "mcq", "short_answer", "essay"

For answers:
- question_id: Must match a question id
- text: The complete student answer (transcribe carefully)
- confidence: Transcription confidence (0.0 to 1.0)

Important:
- Distinguish between printed question text and handwritten answer text
- Questions are usually printed/typed; answers are usually handwritten
- Match each answer to its corresponding question
- Include all work shown in mathematical answers
- If an answer is blank, include with "No answer provided"

Return ONLY the JSON object, no other text."""
        })

        logger.info("ocr_combined_start", image_count=len(image_content), text_count=len(text_contents))

        response_text = await self._call_vision_api(content, max_tokens=16384)

        data = self._parse_json_response(response_text)

        # Parse questions
        questions = []
        for q in data.get("questions", []):
            try:
                q_type = q.get("question_type", "descriptive").lower().replace("-", "_").replace(" ", "_")
                try:
                    question_type = QuestionType(q_type)
                except ValueError:
                    question_type = QuestionType.DESCRIPTIVE

                questions.append(Question(
                    id=str(q["id"]),
                    text=q["text"],
                    max_score=float(q.get("max_score", 5)),
                    question_type=question_type
                ))
            except Exception as e:
                logger.error("question_parse_error", question=q, error=str(e))

        # Parse answers
        answers = []
        for a in data.get("answers", []):
            try:
                answers.append(Answer(
                    question_id=str(a["question_id"]),
                    text=a["text"],
                    confidence=float(a.get("confidence", 1.0))
                ))
            except Exception as e:
                logger.error("answer_parse_error", answer=a, error=str(e))

        logger.info(
            "ocr_combined_complete",
            question_count=len(questions),
            answer_count=len(answers)
        )
        return questions, answers

    async def extract_rubric(self, rubric_dir: Path) -> list[RubricCriteria]:
        """
        Extract grading criteria from rubric files (text, images, or PDFs).

        Args:
            rubric_dir: Directory containing rubric files

        Returns:
            List of RubricCriteria objects
        """
        logger.info("extract_rubric_start", rubric_dir=str(rubric_dir), exists=rubric_dir.exists())

        if not rubric_dir.exists():
            logger.error("rubric_dir_not_found", rubric_dir=str(rubric_dir))
            return []

        # List files in rubric directory before processing
        files_before = list(rubric_dir.glob("*"))
        logger.info(
            "rubric_dir_contents_before",
            rubric_dir=str(rubric_dir),
            files=[f.name for f in files_before]
        )

        image_content, text_contents = await self._prepare_directory_content(rubric_dir)

        # List files in rubric directory after processing (to see if images were created)
        files_after = list(rubric_dir.glob("*"))
        logger.info(
            "rubric_dir_contents_after",
            rubric_dir=str(rubric_dir),
            files=[f.name for f in files_after],
            new_files=[f.name for f in files_after if f not in files_before]
        )

        content = []

        # Add text file contents
        for text_content in text_contents:
            content.append({
                "type": "text",
                "text": f"Rubric content:\n{text_content}\n---"
            })

        # Add images
        content.extend(image_content)

        if not content:
            logger.warning("no_rubric_files", dir=str(rubric_dir))
            return []

        content.append({
            "type": "text",
            "text": """Analyze the rubric content above and extract grading criteria for each question.

For each question, provide:
1. question_id: The question identifier (Q1, 1, etc.)
2. expected_points: Key points/concepts that should be in the answer
3. sample_answer: A model answer if provided
4. scoring_guide: How to allocate marks (as percentages: full=1.0, partial=0.5, minimal=0.2)

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

Important:
- Extract criteria for ALL questions mentioned in the rubric
- Include all expected points/concepts
- Scoring guide values should be decimals (0.0 to 1.0) representing percentage of max score
- If sample answer is not provided, use null

Return ONLY the JSON object."""
        })

        logger.info("ocr_rubric_start", image_count=len(image_content), text_count=len(text_contents))

        response_text = await self._call_vision_api(content, max_tokens=8192)

        data = self._parse_json_response(response_text)

        criteria = []
        for c in data.get("criteria", []):
            try:
                criteria.append(RubricCriteria(
                    question_id=str(c["question_id"]),
                    expected_points=c.get("expected_points", []),
                    sample_answer=c.get("sample_answer"),
                    scoring_guide=c.get("scoring_guide", {"full": 1.0, "partial": 0.5, "minimal": 0.2})
                ))
            except Exception as e:
                logger.error("rubric_parse_error", criteria=c, error=str(e))

        logger.info("ocr_rubric_complete", criteria_count=len(criteria))
        return criteria


# Global instance
_ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    """Get OCR service instance."""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service
