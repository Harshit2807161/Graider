"""LangGraph-based orchestrator for grading pipeline.

This module implements a supervisor-worker pattern using LangGraph:
1. Orchestrator tags triplets with subject and question type
2. Routes to specialized graders based on tags
3. Evaluates grading results for quality
4. Provides feedback loop for rejected grades
"""

from typing import Literal, Optional
import json

import structlog
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

from pydantic import BaseModel, ConfigDict

from app.llm.config import get_llm_settings
from app.llm.router import get_router
from app.llm.types import CallContext, LLMAllTargetsFailed, LLMRequest, Role, TextPart
from app.schemas.grading import GradingResult, Triplet
from app.core.langgraph_setup import (
    GradingState,
    create_initial_state,
)
from .graders.math_grader import MathGrader
from .graders.english_grader import EnglishGrader
from .graders.science_grader import ScienceGrader
from .graders.history_grader import HistoryGrader
from .graders.general_grader import GeneralGrader

logger = structlog.get_logger(__name__)


class TagOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: Literal["math", "english", "science", "history", "general"]
    question_type: Literal[
        "mcq", "short_answer", "descriptive", "problem", "essay",
        "assertion_reasoning", "differentiate", "elucidate",
    ]


class EvaluationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_acceptable: bool
    concerns: str
    improvement_suggestions: str


class LangGraphOrchestrator:
    """
    LangGraph-based orchestrator that coordinates the grading pipeline.

    Tagging uses the `grader` model role and evaluation the `evaluator` role, via the model router.
    Delegates to specialized graders for actual grading.
    """

    def __init__(self):

        # Initialize graders
        self.graders = {
            "math_grader": MathGrader(),
            "english_grader": EnglishGrader(),
            "science_grader": ScienceGrader(),
            "history_grader": HistoryGrader(),
            "general_grader": GeneralGrader(),
        }

        # Build the graph. No checkpointer: each triplet is graded in one shot, and the
        # previous MemorySaver keyed threads by question id, so state from one submission
        # leaked into the next grading of the same question and memory grew without bound.
        self.graph = self._build_graph()
        self.compiled_graph = self.graph.compile()

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

    async def _tag_triplet_node(self, state: GradingState) -> dict:
        """Tag the triplet with subject and question type using the LLM."""
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

        try:
            result = await get_router().call(
                LLMRequest[TagOutput](
                    role=Role.GRADER,  # cheap classification: the grader model is enough
                    system="You are a question classifier.",
                    parts=[TextPart(text=prompt)],
                    output_schema=TagOutput,
                    context=CallContext(purpose="tag", question_id=triplet_data.get("question_id")),
                    exclude_models=frozenset({get_llm_settings().evaluator.model}),
                    max_tokens=1024,
                )
            )
            subject_tag = result.parsed.subject
            question_type_tag = result.parsed.question_type
        except LLMAllTargetsFailed as e:
            # Tagging only picks a grader persona; fall back to the general grader
            logger.warning("tag_failed", error=str(e)[:300])
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
            result = await grader.grade_with_feedback(triplet, feedback)
        else:
            result = await grader.grade(triplet)

        result_dict = result.model_dump()

        # Record this attempt
        attempt = {
            "result": result_dict,
            "attempt_number": state["current_attempt"],
            "feedback": feedback,
            "is_accepted": False,
        }

        return {
            "current_result": result_dict,
            "grading_attempts": [attempt],
        }

    async def _math_grader_node(self, state: GradingState) -> dict:
        return await self._grade_with_grader(state, "math_grader")

    async def _english_grader_node(self, state: GradingState) -> dict:
        return await self._grade_with_grader(state, "english_grader")

    async def _science_grader_node(self, state: GradingState) -> dict:
        return await self._grade_with_grader(state, "science_grader")

    async def _history_grader_node(self, state: GradingState) -> dict:
        return await self._grade_with_grader(state, "history_grader")

    async def _general_grader_node(self, state: GradingState) -> dict:
        return await self._grade_with_grader(state, "general_grader")

    async def _evaluate_result_node(self, state: GradingState) -> dict:
        """Evaluate the grading result for quality."""
        triplet_data = state["triplet"]
        result = state["current_result"]

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

        try:
            evaluation = await get_router().call(
                LLMRequest[EvaluationOutput](
                    role=Role.EVALUATOR,
                    system="You are a grading quality evaluator.",
                    parts=[TextPart(text=prompt)],
                    output_schema=EvaluationOutput,
                    context=CallContext(
                        purpose="evaluate",
                        question_id=triplet_data.get("question_id"),
                        round=state["current_attempt"],
                    ),
                    max_tokens=2048,
                )
            )
            is_acceptable = evaluation.parsed.is_acceptable
            feedback = evaluation.parsed.improvement_suggestions
        except LLMAllTargetsFailed as e:
            # The evaluator is a quality check; if every evaluator model fails, keep the grade
            logger.warning("evaluation_failed", error=str(e)[:300])
            is_acceptable = True
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
        """
        initial_state = create_initial_state(triplet)
        final_state = await self.compiled_graph.ainvoke(initial_state)

        result_dict = final_state.get("final_result") or final_state.get("current_result")
        if not result_dict:
            # Don't invent a score; let the pipeline mark the submission as failed
            raise RuntimeError(f"Grading graph produced no result for question {triplet.question_id}")
        return GradingResult(**result_dict)

    async def grade_batch(self, triplets: list[Triplet]) -> list[GradingResult]:
        """
        Grade multiple triplets.
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
