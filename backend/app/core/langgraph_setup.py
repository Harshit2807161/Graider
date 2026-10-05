"""LangGraph setup for Gr8r grading orchestration.

This module defines the state graph for the grading pipeline:
1. Orchestrator tags triplets (subject + question type)
2. Routes to specialized graders
3. Evaluates grading results
4. Feedback loop for low-confidence grades
"""

from typing import Annotated, Literal, Optional
from typing_extensions import TypedDict
import operator

from langgraph.graph import StateGraph
from langgraph.checkpoint.memory import MemorySaver

from app.schemas.grading import (
    QuestionType,
    Subject,
    Triplet,
)


# ===== State Definitions =====

class TripletWithTags(TypedDict):
    """A triplet enriched with orchestrator tags."""
    triplet: dict  # Triplet model as dict
    subject_tag: str  # Subject classification
    question_type_tag: str  # Question type classification
    assigned_grader: str  # Which grader to use


class GradingAttempt(TypedDict):
    """A single grading attempt with potential feedback."""
    result: dict  # GradingResult model as dict
    attempt_number: int
    feedback: Optional[str]  # Feedback from evaluator if rejected
    is_accepted: bool


class GradingState(TypedDict):
    """Main state for the grading graph.

    This state tracks the progress of grading a single triplet through
    the orchestration pipeline.
    """
    # Input
    triplet: dict  # The triplet to grade
    rubric_context: Optional[str]  # Additional rubric context

    # Tagging stage
    subject_tag: str
    question_type_tag: str
    assigned_grader: str

    # Grading stage
    current_attempt: int
    max_attempts: int
    grading_attempts: Annotated[list[dict], operator.add]  # Accumulates attempts

    # Evaluation stage
    current_result: Optional[dict]  # Current grading result
    evaluator_feedback: Optional[str]
    is_accepted: bool

    # Final output
    final_result: Optional[dict]  # The accepted GradingResult


class BatchGradingState(TypedDict):
    """State for grading multiple triplets in sequence."""
    triplets: list[dict]  # All triplets to grade
    current_index: int  # Which triplet we're processing
    results: Annotated[list[dict], operator.add]  # Accumulated results
    errors: Annotated[list[str], operator.add]  # Any errors encountered


# ===== Node Type Hints =====

# Grader nodes
GRADER_NODES = Literal[
    "math_grader",
    "english_grader",
    "science_grader",
    "history_grader",
    "general_grader",
]

# All possible routing destinations
ROUTING_TARGETS = Literal[
    "tag_triplet",
    "route_to_grader",
    "math_grader",
    "english_grader",
    "science_grader",
    "history_grader",
    "general_grader",
    "evaluate_result",
    "provide_feedback",
    "finalize_result",
    "next_triplet",
    "__end__",
]


# ===== Graph Builder =====

def create_grading_graph() -> StateGraph:
    """Create the grading state graph.

    Graph structure:

    START → tag_triplet → route_to_grader → [grader] → evaluate_result
                                                              ↓
                                              ┌───────────────┴───────────────┐
                                              ↓                               ↓
                                      (accepted)                      (rejected)
                                              ↓                               ↓
                                      finalize_result              provide_feedback
                                              ↓                               ↓
                                            END                    route_to_grader
                                                                   (retry loop)

    Returns:
        Configured StateGraph ready to compile
    """
    builder = StateGraph(GradingState)

    # Nodes will be added by the orchestrator module
    # This function returns the builder for external configuration

    return builder


def create_batch_grading_graph() -> StateGraph:
    """Create a graph for processing multiple triplets.

    This wraps the single-triplet grading graph to process
    a batch of triplets sequentially.

    Returns:
        Configured StateGraph for batch processing
    """
    builder = StateGraph(BatchGradingState)

    # Nodes will be added by the orchestrator module

    return builder


# ===== Memory/Checkpointing =====

def get_memory_saver() -> MemorySaver:
    """Get a memory saver for graph checkpointing.

    This enables:
    - State persistence during execution
    - Resume from failures
    - Debugging intermediate states

    Returns:
        MemorySaver instance
    """
    return MemorySaver()


# ===== Helper Functions =====

def subject_to_grader(subject: Subject) -> str:
    """Map a subject to its grader node name."""
    mapping = {
        Subject.MATH: "math_grader",
        Subject.ENGLISH: "english_grader",
        Subject.SCIENCE: "science_grader",
        Subject.HISTORY: "history_grader",
        Subject.GENERAL: "general_grader",
    }
    return mapping.get(subject, "general_grader")


def question_type_to_string(qt: QuestionType) -> str:
    """Map question type enum to string for tagging."""
    return qt.value


def create_initial_state(triplet: Triplet) -> GradingState:
    """Create initial state for grading a single triplet.

    Args:
        triplet: The triplet to grade

    Returns:
        Initialized GradingState
    """
    return GradingState(
        triplet=triplet.model_dump(),
        rubric_context=None,
        subject_tag="",
        question_type_tag="",
        assigned_grader="",
        current_attempt=0,
        max_attempts=3,  # Max retry attempts
        grading_attempts=[],
        current_result=None,
        evaluator_feedback=None,
        is_accepted=False,
        final_result=None,
    )


def create_batch_initial_state(triplets: list[Triplet]) -> BatchGradingState:
    """Create initial state for batch grading.

    Args:
        triplets: List of triplets to grade

    Returns:
        Initialized BatchGradingState
    """
    return BatchGradingState(
        triplets=[t.model_dump() for t in triplets],
        current_index=0,
        results=[],
        errors=[],
    )
