"""LangGraph-based orchestrator for grading pipeline.

This module implements a supervisor-worker pattern using LangGraph:
1. Orchestrator tags triplets with subject and question type
2. Routes to specialized graders based on tags
3. Evaluates grading results for quality
4. Provides feedback loop for rejected grades
"""

from typing import Literal, Optional
import json

import anthropic
import structlog
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
from langgraph.checkpoint.memory import MemorySaver

from app.core.config import get_settings
from app.schemas.grading import GradingResult, QuestionType, Subject, Triplet
from app.core.langgraph_setup import (
    GradingState,
    BatchGradingState,
    create_initial_state,
    create_batch_initial_state,
    subject_to_grader,
    get_memory_saver,
)
from .graders.math_grader import MathGrader
from .graders.english_grader import EnglishGrader
from .graders.science_grader import ScienceGrader
from .graders.history_grader import HistoryGrader

logger = structlog.get_logger(__name__)


class LangGraphOrchestrator:
    """
    LangGraph-based orchestrator that coordinates the grading pipeline.

    Uses Claude Opus 4.5 for tagging and evaluation decisions.
    Delegates to specialized graders (Claude Sonnet 4) for actual grading.
    """

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.orchestrator_model = settings.CLAUDE_ORCHESTRATOR_MODEL
        self.tagger_model = settings.CLAUDE_GRADER_MODEL  # Use Sonnet for tagging (faster, less congested)

        # Initialize graders
        self.graders = {
            "math_grader": MathGrader(),
            "english_grader": EnglishGrader(),
            "science_grader": ScienceGrader(),
            "history_grader": HistoryGrader(),
            "general_grader": EnglishGrader(),  # Default fallback
        }

        # Build the graph
        self.graph = self._build_graph()
        self.memory = get_memory_saver()
        self.compiled_graph = self.graph.compile(checkpointer=self.memory)

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph state graph for grading."""
        builder = StateGraph(GradingState)

        # Add nodes
        builder.add_node("tag_triplet", self._tag_triplet_node)
        builder.add_node("route_to_grader", self._route_to_grader_node)
        builder.add_node("math_grader", self._math_grader_node)
        builder.add_node("english_grader", self._english_grader_node)
        builder.add_node("science_grader", self._science_grader_node)
        builder.add_node("history_grader", self._history_grader_node)
        builder.add_node("general_grader", self._general_grader_node)
        builder.add_node("evaluate_result", self._evaluate_result_node)
        builder.add_node("provide_feedback", self._provide_feedback_node)
        builder.add_node("finalize_result", self._finalize_result_node)

        # Add edges
        builder.add_edge(START, "tag_triplet")
        builder.add_edge("tag_triplet", "route_to_grader")

        # Graders return to evaluator
        builder.add_edge("math_grader", "evaluate_result")
        builder.add_edge("english_grader", "evaluate_result")
        builder.add_edge("science_grader", "evaluate_result")
        builder.add_edge("history_grader", "evaluate_result")
        builder.add_edge("general_grader", "evaluate_result")

        # Conditional edges from evaluator
        builder.add_conditional_edges(
            "evaluate_result",
            self._should_accept_or_retry,
            {
                "accept": "finalize_result",
                "retry": "provide_feedback",
                "max_retries": "finalize_result",
            }
        )

        # Feedback loops back to routing
        builder.add_edge("provide_feedback", "route_to_grader")

        # Final node ends the graph
        builder.add_edge("finalize_result", END)

        return builder

    # ===== Node Implementations =====

    def _tag_triplet_node(self, state: GradingState) -> dict:
        """Tag the triplet with subject and question type using Claude."""
        triplet_data = state["triplet"]

        prompt = f"""Analyze this question and classify it:

Question: {triplet_data.get('question_text', '')}

Provide classification as JSON:
{{
  "subject": "math" | "english" | "science" | "history" | "general",
  "question_type": "mcq" | "short_answer" | "descriptive" | "problem" | "essay" | "assertion_reasoning" | "differentiate" | "elucidate"
}}

Consider:
- MCQ: Multiple choice questions
- Short Answer: Brief factual responses
- Descriptive: Explain/describe questions
- Problem: Mathematical or logical problems
- Essay: Long-form writing
- Assertion Reasoning: Statement analysis
- Differentiate: Compare/contrast questions
- Elucidate: Clarify/elaborate questions

Return ONLY the JSON object."""

        response = self.client.messages.create(
            model=self.tagger_model,  # Use Sonnet for faster tagging
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = response.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        try:
            tags = json.loads(response_text)
            subject_tag = tags.get("subject", "general")
            question_type_tag = tags.get("question_type", "descriptive")
        except json.JSONDecodeError:
            logger.warning("tag_parse_error", response=response_text[:200])
            subject_tag = "general"
            question_type_tag = "descriptive"

        assigned_grader = f"{subject_tag}_grader"

        logger.info(
            "triplet_tagged",
            question_id=triplet_data.get("question_id"),
            subject=subject_tag,
            question_type=question_type_tag,
            grader=assigned_grader
        )

        return {
            "subject_tag": subject_tag,
            "question_type_tag": question_type_tag,
            "assigned_grader": assigned_grader,
        }

    def _route_to_grader_node(self, state: GradingState) -> Command:
        """Route to the appropriate grader based on tags."""
        grader = state["assigned_grader"]

        # Validate grader exists
        if grader not in self.graders:
            grader = "general_grader"

        logger.info(
            "routing_to_grader",
            grader=grader,
            attempt=state["current_attempt"] + 1
        )

        return Command(
            goto=grader,
            update={"current_attempt": state["current_attempt"] + 1}
        )

    async def _grade_with_grader(self, state: GradingState, grader_name: str) -> dict:
        """Common grading logic for all grader nodes."""
        triplet_data = state["triplet"]
        triplet = Triplet(**triplet_data)

        # Add feedback context if this is a retry
        feedback = state.get("evaluator_feedback")

        grader = self.graders[grader_name]

        # Grade the triplet
        if feedback:
            # Enhance grading with evaluator feedback
            result = await grader.grade_with_feedback(triplet, feedback)
        else:
            result = await grader.grade(triplet)

        result_dict = result.model_dump()

        # Record this attempt
        attempt = {
            "result": result_dict,
            "attempt_number": state["current_attempt"],
            "feedback": feedback,
            "is_accepted": False,  # Not yet evaluated
        }

        return {
            "current_result": result_dict,
            "grading_attempts": [attempt],
        }

    async def _math_grader_node(self, state: GradingState) -> dict:
        """Math grader node."""
        return await self._grade_with_grader(state, "math_grader")

    async def _english_grader_node(self, state: GradingState) -> dict:
        """English grader node."""
        return await self._grade_with_grader(state, "english_grader")

    async def _science_grader_node(self, state: GradingState) -> dict:
        """Science grader node."""
        return await self._grade_with_grader(state, "science_grader")

    async def _history_grader_node(self, state: GradingState) -> dict:
        """History grader node."""
        return await self._grade_with_grader(state, "history_grader")

    async def _general_grader_node(self, state: GradingState) -> dict:
        """General/fallback grader node."""
        return await self._grade_with_grader(state, "general_grader")

    def _evaluate_result_node(self, state: GradingState) -> dict:
        """Evaluate the grading result for quality."""
        triplet_data = state["triplet"]
        result = state["current_result"]

        # Build evaluation prompt
        prompt = f"""Evaluate this grading result for quality and consistency.

Question ({state['subject_tag']}, {state['question_type_tag']}):
{triplet_data.get('question_text', '')}

Student Answer:
{triplet_data.get('candidate_answer', '')}

Grading Result:
- Score: {result.get('score')}/{result.get('max_score')}
- Reasoning: {result.get('reasoning', '')}
- Feedback: {result.get('feedback', '')}
- Confidence: {result.get('confidence', 0)}

Rubric (if available):
{json.dumps(triplet_data.get('expected_answer'), indent=2) if triplet_data.get('expected_answer') else 'Not provided'}

Evaluate:
1. Is the score reasonable given the answer quality?
2. Is the reasoning clear and grounded in the rubric?
3. Is the feedback constructive and specific?
4. Is the confidence level appropriate?

Respond with JSON:
{{
  "is_acceptable": true/false,
  "concerns": "Brief description of any issues",
  "improvement_suggestions": "Specific suggestions if not acceptable"
}}"""

        response = self.client.messages.create(
            model=self.orchestrator_model,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = response.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        try:
            evaluation = json.loads(response_text)
            is_acceptable = evaluation.get("is_acceptable", True)
            feedback = evaluation.get("improvement_suggestions", "")
        except json.JSONDecodeError:
            logger.warning("evaluation_parse_error", response=response_text[:200])
            is_acceptable = True  # Accept on parse error
            feedback = ""

        # Also check confidence threshold
        confidence = result.get("confidence", 1.0)
        if confidence < 0.6 and is_acceptable:
            is_acceptable = False
            feedback = f"Low confidence ({confidence:.2f}). Please provide more detailed reasoning."

        logger.info(
            "result_evaluated",
            question_id=triplet_data.get("question_id"),
            is_acceptable=is_acceptable,
            confidence=confidence,
            attempt=state["current_attempt"]
        )

        return {
            "is_accepted": is_acceptable,
            "evaluator_feedback": feedback if not is_acceptable else None,
        }

    def _should_accept_or_retry(self, state: GradingState) -> str:
        """Decide whether to accept result, retry, or give up."""
        if state["is_accepted"]:
            return "accept"

        if state["current_attempt"] >= state["max_attempts"]:
            logger.warning(
                "max_retries_reached",
                question_id=state["triplet"].get("question_id"),
                attempts=state["current_attempt"]
            )
            return "max_retries"

        return "retry"

    def _provide_feedback_node(self, state: GradingState) -> dict:
        """Prepare feedback for retry."""
        logger.info(
            "providing_feedback",
            question_id=state["triplet"].get("question_id"),
            feedback=state["evaluator_feedback"][:100] if state["evaluator_feedback"] else None
        )
        # Feedback is already in state, just pass through
        return {}

    def _finalize_result_node(self, state: GradingState) -> dict:
        """Finalize and return the grading result."""
        result = state["current_result"]

        logger.info(
            "result_finalized",
            question_id=state["triplet"].get("question_id"),
            score=result.get("score"),
            max_score=result.get("max_score"),
            attempts=state["current_attempt"]
        )

        return {
            "final_result": result,
        }

    # ===== Public API =====

    async def grade_triplet(self, triplet: Triplet) -> GradingResult:
        """
        Grade a single triplet through the LangGraph pipeline.

        Args:
            triplet: The triplet to grade

        Returns:
            GradingResult with score, reasoning, and feedback
        """
        initial_state = create_initial_state(triplet)

        # Run the graph asynchronously
        config = {"configurable": {"thread_id": triplet.question_id}}
        final_state = await self.compiled_graph.ainvoke(initial_state, config)

        # Extract result
        result_dict = final_state.get("final_result") or final_state.get("current_result")

        if result_dict:
            return GradingResult(**result_dict)

        # Fallback if something went wrong
        return GradingResult(
            question_id=triplet.question_id,
            score=0,
            max_score=triplet.max_score,
            reasoning="Error: Unable to complete grading",
            feedback="Please review this answer manually",
            grader="orchestrator",
            confidence=0.0
        )

    async def grade_batch(self, triplets: list[Triplet]) -> list[GradingResult]:
        """
        Grade multiple triplets.

        Args:
            triplets: List of triplets to grade

        Returns:
            List of GradingResults
        """
        results = []
        for triplet in triplets:
            result = await self.grade_triplet(triplet)
            results.append(result)
        return results


# ===== Module-level instance =====

_orchestrator: Optional[LangGraphOrchestrator] = None


def get_orchestrator() -> LangGraphOrchestrator:
    """Get the orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = LangGraphOrchestrator()
    return _orchestrator
