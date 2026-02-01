# AGNTCY Deep Research Report for Gr8r Grading System

## Executive Summary

This report provides comprehensive documentation on AGNTCY (pronounced "agency"), an open-source initiative building infrastructure for the "Internet of Agents." AGNTCY enables specialized AI agents to discover, communicate, and collaborate across different platforms, frameworks, and organizations. This research supports the development of **Gr8r**, a multi-agent grading system that orchestrates specialized subject-matter agents to evaluate handwritten subjective answers.

**Key Finding**: AGNTCY provides a robust framework for building the Gr8r grading orchestration system through its Application SDK (for transport-agnostic agent communication), LangGraph integration (for supervisor-worker orchestration patterns), and comprehensive observability tools (for debugging multi-agent workflows).

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [SDK and API Documentation](#2-sdk-and-api-documentation)
3. [Agent Orchestration](#3-agent-orchestration)
4. [LangGraph Integration](#4-langgraph-integration)
5. [Building Specialized Agents](#5-building-specialized-agents)
6. [Workflow Patterns](#6-workflow-patterns)
7. [Code Examples](#7-code-examples)
8. [Observability and Debugging](#8-observability-and-debugging)
9. [Recommendations for Gr8r Implementation](#9-recommendations-for-gr8r-implementation)

---

## 1. Platform Overview

### What is AGNTCY?

AGNTCY is a Linux Foundation project (donated July 2025) that provides foundational infrastructure for agent collaboration. It was originally launched by Outshift (Cisco) in March 2025 and has grown to include formative members such as Cisco, Dell, Google Cloud, Oracle, and Red Hat, with over 75 companies contributing.

**Mission**: Deliver "the complete stack for the Internet of Agents so that specialized agents can collaborate across platforms to solve complex problems."

### Core Capabilities

AGNTCY addresses four key capabilities:

| Capability | Description |
|------------|-------------|
| **Discover** | Find and understand agent capabilities using OASF (Open Agentic Schema Framework) |
| **Compose** | Build workflows using standardized protocols (A2A, MCP) |
| **Deploy** | Secure cross-organizational agent interactions with identity verification |
| **Evaluate** | Monitor and debug multi-agent systems with observability tools |

### Primary Components

1. **Open Agentic Schema Framework (OASF)** - Extensible data model for describing agent attributes
2. **Agent Directory Service** - Distributed discovery and announcement of agents
3. **SLIM (Secure Low-Latency Interactive Messaging)** - Network-level communication protocol
4. **Identity System** - Decentralized identity management with verifiable credentials
5. **Observability SDK** - OpenTelemetry-compliant tracing and monitoring

### GitHub Repositories

| Repository | Language | Description | Stars |
|------------|----------|-------------|-------|
| [oasf](https://github.com/agntcy/oasf) | Elixir | Open Agentic Schema Framework | 275 |
| [slim](https://github.com/agntcy/slim) | Rust | Secure Low-Latency Interactive Messaging | 167 |
| [dir](https://github.com/agntcy/dir) | Go | Distributed agent discovery | 133 |
| [identity](https://github.com/agntcy/identity) | Go | Agent identity onboarding | 81 |
| [coffeeAgntcy](https://github.com/agntcy/coffeeAgntcy) | Python | Reference implementation | 64 |
| [observe](https://github.com/agntcy/observe) | Python | Observability SDK | 54 |
| [app-sdk](https://github.com/agntcy/app-sdk) | Python | Application SDK factory | - |
| [acp-sdk](https://github.com/agntcy/acp-sdk) | Python | Agent Connect Protocol SDK | - |

---

## 2. SDK and API Documentation

### Application SDK (Recommended for Gr8r)

The **AGNTCY Application SDK** (`agntcy-app-sdk`) provides a unified factory interface for building interoperable multi-agent components.

#### Installation

```bash
pip install agntcy-app-sdk
# or
uv add agntcy-app-sdk
```

**Requirements**: Python 3.12+

#### Architecture Layers

- **Semantic Layer**: A2A, MCP, and FastMCP protocols
- **Transport Layer**: SLIM (v0.6.1), NATS, HTTP streaming
- **Directory Services**: Agent discovery and registry
- **Identity Management**: Authentication and verification
- **Observability**: Integrated tracing via Observe SDK

#### Factory Pattern Usage

```python
from agntcy_app_sdk.factory import AgntcyFactory

factory = AgntcyFactory()

# Discover available components
factory.registered_protocols()           # ['A2A', 'MCP', 'FastMCP']
factory.registered_transports()          # ['SLIM', 'NATS', 'STREAMABLE_HTTP']
factory.registered_observability_providers()  # ['ioa_observe']
```

### Agent Connect Protocol SDK (ACP)

The **ACP SDK** (`agntcy-acp`) implements the Agent Connect Protocol for agent interoperability.

#### Installation

```bash
pip install agntcy-acp
```

**Current Version**: 1.5.2 (as of June 2025)
**Requirements**: Python 3.9+

#### Features

- Synchronous and asynchronous HTTP clients
- Auto-generated from OpenAPI specification
- Type-safe interfaces with Pydantic models
- Validation, serialization, and type hints

### Key Resources

- **ACP Specification**: https://spec.acp.agntcy.org/
- **PyPI Package**: https://pypi.org/project/agntcy-acp/
- **GitHub**: https://github.com/agntcy/acp-sdk

---

## 3. Agent Orchestration

### Communication Protocols

AGNTCY supports two primary protocols for agent orchestration:

#### A2A (Agent-to-Agent) Protocol

The A2A protocol enables AI agents built on diverse frameworks to communicate and collaborate effectively.

**Architecture**:
- **A2A Client**: Application or agent that delegates requests to remote agents
- **A2A Server**: Receives requests, processes tasks, and responds with results
- **Agent Card**: JSON manifest at `/.well-known/agent.json` describing agent capabilities

**Communication Flow**:
1. Client discovers server via Agent Card
2. Client sends message/task request
3. Server processes task asynchronously
4. Server returns status updates and results

```python
# A2A Client Example
from agntcy_app_sdk.factory import AgntcyFactory

factory = AgntcyFactory()
transport = factory.create_transport("NATS", "localhost:4222")

client = await factory.create_client(
    "A2A",
    agent_topic="my_remote_a2a_server",
    transport=transport
)
```

#### MCP (Model Context Protocol)

MCP provides standardized integration for external tools and data sources.

```python
# MCP Client Example
transport = factory.create_transport(
    transport="SLIM",
    endpoint="http://localhost:46357",
    name="org/namespace/agent-foo"
)

mcp_client = factory.create_client(
    "MCP",
    agent_topic="my_remote_mcp_server",
    transport=transport
)

async with mcp_client as client:
    tools = await client.list_tools()
```

### SLIM Messaging Protocol

SLIM (Secure Low-Latency Interactive Messaging) is AGNTCY's core communication protocol.

**Features**:
- Unicast, anycast, and multicast group communication
- MLS (Message Layer Security) for quantum-safe encryption
- gRPC-based with pub/sub capabilities
- Supports all gRPC streaming modes

**Key Components**:
- Messaging nodes (intelligent message queues)
- Message producers (publish encrypted content)
- Message consumers (subscribe and receive)

**Communication Patterns**:
| Pattern | Description |
|---------|-------------|
| Request-Reply | Synchronous request/response |
| Unicast | Fire-and-forget to single recipient |
| Pub/Sub | One-to-many publication |
| Group Communication | Many-to-many with MLS encryption |

---

## 4. LangGraph Integration

### Overview

AGNTCY integrates seamlessly with LangGraph for orchestrating multi-agent workflows. LangGraph models agent workflows as graphs with three key components:

- **State**: Shared data structure representing current application snapshot
- **Nodes**: Python functions encoding agent logic
- **Edges**: Functions determining next node execution

### Supervisor-Worker Pattern

The supervisor pattern is the recommended approach for Gr8r's orchestration architecture.

```python
from langgraph.graph import StateGraph
from langchain_anthropic import ChatAnthropic

# Initialize Claude model
llm = ChatAnthropic(model="claude-sonnet-4-5-20250929")

# Define state schema
class GraderState(TypedDict):
    question: str
    answer: str
    subject_tags: List[str]
    grading_results: Annotated[List[dict], operator.add]
    final_score: Optional[float]
    feedback: str

# Create supervisor graph
graph = StateGraph(GraderState)

# Add nodes
graph.add_node("orchestrator", orchestrator_node)
graph.add_node("math_grader", math_grader_node)
graph.add_node("english_grader", english_grader_node)
graph.add_node("science_grader", science_grader_node)
graph.add_node("evaluator", evaluator_node)

# Define edges
graph.add_edge(START, "orchestrator")
graph.add_conditional_edges(
    "orchestrator",
    route_to_graders,
    ["math_grader", "english_grader", "science_grader"]
)
```

### Key LangGraph Features for Multi-Agent Systems

1. **Persistence**: State checkpointing across agent interactions
2. **Streaming**: Real-time output from long-running tasks
3. **Memory Systems**: Short-term and long-term memory integration
4. **Handoffs**: Agents can transfer control back to supervisor

```python
# Using handoffs
from langgraph.prebuilt import create_supervisor

supervisor = create_supervisor(
    llm=llm,
    agents=[math_grader, english_grader, science_grader],
    add_handoff_back_messages=True  # Enable agent-to-supervisor handoffs
)
```

---

## 5. Building Specialized Agents

### Agent Structure with Custom System Prompts

Each specialized grader agent should have its own system prompt and grading guidelines.

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

# Math Grader Agent
math_system_prompt = """You are a specialized Mathematics grading agent.

GRADING GUIDELINES:
1. Check mathematical accuracy (40%)
2. Evaluate problem-solving methodology (30%)
3. Assess clarity of work shown (20%)
4. Consider partial credit for correct approach (10%)

SCORING RUBRIC:
- Full marks: Correct answer with clear methodology
- Partial credit: Correct approach, calculation errors
- Minimal credit: Some understanding shown
- No credit: Completely incorrect or irrelevant

Always provide specific feedback referencing the student's work."""

math_grader = ChatAnthropic(model="claude-sonnet-4-5-20250929").bind(
    system=math_system_prompt
)
```

### Creating Subject-Specific Grader Agents

```python
class SubjectGrader:
    def __init__(self, subject: str, system_prompt: str, rubric: dict):
        self.subject = subject
        self.llm = ChatAnthropic(model="claude-sonnet-4-5-20250929")
        self.system_prompt = system_prompt
        self.rubric = rubric

    async def grade(self, question: str, answer: str, max_score: float) -> dict:
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("human", """
Question: {question}
Student Answer: {answer}
Maximum Score: {max_score}

Grade this answer according to the rubric and provide:
1. Score (0 to {max_score})
2. Detailed feedback
3. Areas for improvement
""")
        ])

        chain = prompt | self.llm
        result = await chain.ainvoke({
            "question": question,
            "answer": answer,
            "max_score": max_score
        })

        return {
            "subject": self.subject,
            "score": self._extract_score(result.content),
            "feedback": result.content,
            "rubric_applied": self.rubric
        }

# Initialize specialized graders
graders = {
    "math": SubjectGrader(
        subject="Mathematics",
        system_prompt=math_system_prompt,
        rubric={"accuracy": 0.4, "methodology": 0.3, "clarity": 0.2, "partial": 0.1}
    ),
    "english": SubjectGrader(
        subject="English",
        system_prompt=english_system_prompt,
        rubric={"content": 0.35, "language": 0.25, "structure": 0.25, "creativity": 0.15}
    ),
    "science": SubjectGrader(
        subject="Science",
        system_prompt=science_system_prompt,
        rubric={"concepts": 0.4, "application": 0.3, "accuracy": 0.2, "reasoning": 0.1}
    )
}
```

### Agent Registration with OASF

Use the Open Agentic Schema Framework to register agents for discovery:

```python
# Agent record for OASF registration
math_grader_record = {
    "name": "math-grader-agent",
    "version": "1.0.0",
    "description": "Specialized agent for grading mathematics answers",
    "skills": [
        {
            "name": "grade_math_answer",
            "domain": "education/assessment/mathematics",
            "description": "Grades mathematical answers with detailed feedback"
        }
    ],
    "capabilities": {
        "streaming": True,
        "async_processing": True
    }
}
```

---

## 6. Workflow Patterns

### Fan-Out/Fan-In Pattern for Parallel Grading

LangGraph's fan-out/fan-in pattern is ideal for grading multiple aspects simultaneously.

```python
from langgraph.graph import StateGraph, START, END
from typing import Annotated, List
import operator

class GradingState(TypedDict):
    question: str
    answer: str
    subject: str
    # Use Annotated with operator.add for parallel state updates
    grading_results: Annotated[List[dict], operator.add]
    final_grade: Optional[dict]

def create_grading_graph():
    graph = StateGraph(GradingState)

    # Add orchestrator node
    graph.add_node("orchestrator", orchestrate_grading)

    # Add parallel grading nodes
    graph.add_node("content_grader", grade_content)
    graph.add_node("accuracy_grader", grade_accuracy)
    graph.add_node("style_grader", grade_style)

    # Add aggregator node
    graph.add_node("aggregator", aggregate_grades)

    # Fan-out: orchestrator to parallel graders
    graph.add_edge(START, "orchestrator")
    graph.add_conditional_edges(
        "orchestrator",
        lambda state: ["content_grader", "accuracy_grader", "style_grader"],
        ["content_grader", "accuracy_grader", "style_grader"]
    )

    # Fan-in: all graders to aggregator
    graph.add_edge("content_grader", "aggregator")
    graph.add_edge("accuracy_grader", "aggregator")
    graph.add_edge("style_grader", "aggregator")

    graph.add_edge("aggregator", END)

    return graph.compile()
```

### Map-Reduce for Batch Grading

For grading multiple answers dynamically:

```python
from langgraph.constants import Send

def map_answers_to_graders(state):
    """Dynamically create grading tasks for each answer"""
    answers = state["answers"]

    return [
        Send("grade_single_answer", {
            "answer_id": answer["id"],
            "question": answer["question"],
            "answer_text": answer["answer_text"],
            "subject": answer["subject"]
        })
        for answer in answers
    ]

def grade_single_answer(state):
    """Process individual answer"""
    grader = graders.get(state["subject"])
    result = grader.grade(state["question"], state["answer_text"])
    return {"graded_answers": [result]}

def reduce_grades(state):
    """Aggregate all grading results"""
    all_grades = state["graded_answers"]
    total_score = sum(g["score"] for g in all_grades)
    avg_score = total_score / len(all_grades)

    return {
        "final_score": avg_score,
        "detailed_results": all_grades
    }
```

### Sequential Processing with Feedback Loop

For iterative grading refinement:

```python
def create_feedback_loop_graph():
    graph = StateGraph(GradingState)

    graph.add_node("initial_grade", initial_grading)
    graph.add_node("review_grade", review_grading)
    graph.add_node("refine_grade", refine_grading)
    graph.add_node("finalize", finalize_grading)

    graph.add_edge(START, "initial_grade")
    graph.add_edge("initial_grade", "review_grade")

    # Conditional refinement loop
    graph.add_conditional_edges(
        "review_grade",
        check_confidence,
        {
            "low_confidence": "refine_grade",
            "high_confidence": "finalize"
        }
    )

    graph.add_edge("refine_grade", "review_grade")
    graph.add_edge("finalize", END)

    return graph.compile()

def check_confidence(state):
    """Route based on grading confidence"""
    if state.get("confidence", 0) < 0.8 and state.get("refinement_count", 0) < 3:
        return "low_confidence"
    return "high_confidence"
```

### Error Handling and Retries

```python
from langgraph.checkpoint.memory import MemorySaver

# Enable checkpointing for retry capability
memory = MemorySaver()
graph = create_grading_graph().compile(checkpointer=memory)

# With checkpointing, if a grader fails:
# - Successful results are preserved
# - Only failed branches need retry
# - Graph can resume from last checkpoint

async def grade_with_retry(answer: dict, max_retries: int = 3):
    config = {"configurable": {"thread_id": answer["id"]}}

    for attempt in range(max_retries):
        try:
            result = await graph.ainvoke(answer, config)
            return result
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            # Graph will resume from checkpoint on retry
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

---

## 7. Code Examples

### Complete Gr8r Orchestration System

```python
"""
Gr8r - Multi-Agent Grading Orchestration System
Built with AGNTCY Application SDK and LangGraph
"""

import asyncio
from typing import TypedDict, Annotated, List, Optional
import operator

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from agntcy_app_sdk.factory import AgntcyFactory
from ioa_observe.sdk import Observe
from ioa_observe.sdk.decorators import agent, graph
from ioa_observe.sdk.tracing import session_start

# Initialize observability
Observe.init(
    app_name="gr8r_grading_system",
    api_endpoint="http://localhost:4318"
)

# Initialize AGNTCY factory
factory = AgntcyFactory()

# State Schema
class GradingState(TypedDict):
    # Input
    student_id: str
    question_id: str
    question_text: str
    handwritten_answer: str  # OCR-processed text
    max_score: float

    # Orchestrator decisions
    subject_tags: List[str]
    assigned_graders: List[str]

    # Grading results (using reducer for parallel updates)
    grading_results: Annotated[List[dict], operator.add]

    # Final output
    final_score: Optional[float]
    aggregated_feedback: Optional[str]
    confidence_score: Optional[float]

# System Prompts for Specialized Graders
ORCHESTRATOR_PROMPT = """You are the Gr8r Orchestration Agent. Your role is to:

1. Analyze the question and student's answer
2. Determine appropriate subject tags (e.g., "math", "physics", "english", "history")
3. Assign the answer to relevant specialized graders
4. Evaluate grading results for consistency and fairness

Always consider cross-disciplinary questions that may need multiple graders."""

MATH_GRADER_PROMPT = """You are a Mathematics Grading Agent for Gr8r.

GRADING RUBRIC:
- Mathematical Accuracy (40%): Correct calculations, formulas, and final answer
- Problem-Solving Methodology (30%): Logical approach and steps shown
- Work Clarity (20%): Clear presentation of work
- Partial Credit (10%): Correct approach with minor errors

Provide score as percentage of max_score and detailed feedback."""

ENGLISH_GRADER_PROMPT = """You are an English/Language Arts Grading Agent for Gr8r.

GRADING RUBRIC:
- Content & Ideas (35%): Relevance, depth, and originality
- Language & Grammar (25%): Correctness, vocabulary, sentence structure
- Organization (25%): Logical flow, paragraphing, coherence
- Style & Voice (15%): Engagement, tone appropriateness

Provide score as percentage of max_score and detailed feedback."""

SCIENCE_GRADER_PROMPT = """You are a Science Grading Agent for Gr8r.

GRADING RUBRIC:
- Conceptual Understanding (40%): Correct scientific concepts
- Application (30%): Proper application of principles
- Factual Accuracy (20%): Correct facts, units, terminology
- Scientific Reasoning (10%): Logical deductions and conclusions

Provide score as percentage of max_score and detailed feedback."""

# Initialize LLM
llm = ChatAnthropic(model="claude-sonnet-4-5-20250929")

# Node Functions
@agent(name="orchestrator", description="Routes answers to appropriate graders")
async def orchestrator_node(state: GradingState) -> dict:
    """Analyze question and determine grading strategy"""

    messages = [
        SystemMessage(content=ORCHESTRATOR_PROMPT),
        HumanMessage(content=f"""
Analyze this question and answer:

Question: {state['question_text']}
Student Answer: {state['handwritten_answer']}

Determine:
1. Subject tags (list of subjects this question covers)
2. Which specialized graders should evaluate this answer

Respond in this format:
SUBJECT_TAGS: [tag1, tag2, ...]
ASSIGNED_GRADERS: [grader1, grader2, ...]
""")
    ]

    response = await llm.ainvoke(messages)

    # Parse response (simplified - use structured output in production)
    content = response.content
    subject_tags = ["math"]  # Parse from response
    assigned_graders = ["math_grader"]  # Parse from response

    return {
        "subject_tags": subject_tags,
        "assigned_graders": assigned_graders
    }

@agent(name="math_grader", description="Grades mathematics answers")
async def math_grader_node(state: GradingState) -> dict:
    """Grade mathematical content"""

    messages = [
        SystemMessage(content=MATH_GRADER_PROMPT),
        HumanMessage(content=f"""
Grade this answer:

Question: {state['question_text']}
Student Answer: {state['handwritten_answer']}
Maximum Score: {state['max_score']}

Provide your grading in this format:
SCORE: [number]
CONFIDENCE: [0-1]
FEEDBACK: [detailed feedback]
""")
    ]

    response = await llm.ainvoke(messages)

    # Parse grading result
    result = {
        "grader": "math_grader",
        "subject": "mathematics",
        "score": state['max_score'] * 0.85,  # Parse from response
        "confidence": 0.9,
        "feedback": response.content,
        "rubric_scores": {
            "accuracy": 0.90,
            "methodology": 0.85,
            "clarity": 0.80,
            "partial_credit": 1.0
        }
    }

    return {"grading_results": [result]}

@agent(name="english_grader", description="Grades English/Language answers")
async def english_grader_node(state: GradingState) -> dict:
    """Grade English content"""

    messages = [
        SystemMessage(content=ENGLISH_GRADER_PROMPT),
        HumanMessage(content=f"""
Grade this answer:

Question: {state['question_text']}
Student Answer: {state['handwritten_answer']}
Maximum Score: {state['max_score']}
""")
    ]

    response = await llm.ainvoke(messages)

    result = {
        "grader": "english_grader",
        "subject": "english",
        "score": state['max_score'] * 0.80,
        "confidence": 0.85,
        "feedback": response.content,
        "rubric_scores": {
            "content": 0.85,
            "language": 0.75,
            "organization": 0.80,
            "style": 0.80
        }
    }

    return {"grading_results": [result]}

@agent(name="evaluator", description="Aggregates and validates grading results")
async def evaluator_node(state: GradingState) -> dict:
    """Aggregate grades and generate final assessment"""

    grading_results = state.get("grading_results", [])

    if not grading_results:
        return {
            "final_score": 0,
            "aggregated_feedback": "No grading results available",
            "confidence_score": 0
        }

    # Calculate weighted average based on confidence
    total_weighted_score = sum(
        r["score"] * r["confidence"] for r in grading_results
    )
    total_confidence = sum(r["confidence"] for r in grading_results)

    final_score = total_weighted_score / total_confidence if total_confidence > 0 else 0
    avg_confidence = total_confidence / len(grading_results)

    # Aggregate feedback
    feedback_parts = [
        f"**{r['subject'].title()}**: {r['feedback'][:200]}..."
        for r in grading_results
    ]
    aggregated_feedback = "\n\n".join(feedback_parts)

    return {
        "final_score": round(final_score, 2),
        "aggregated_feedback": aggregated_feedback,
        "confidence_score": round(avg_confidence, 2)
    }

# Routing Function
def route_to_graders(state: GradingState) -> List[str]:
    """Route to appropriate graders based on orchestrator decision"""
    assigned = state.get("assigned_graders", [])

    valid_graders = {"math_grader", "english_grader", "science_grader"}
    return [g for g in assigned if g in valid_graders] or ["math_grader"]

# Build the Graph
@graph(name="gr8r_grading_graph")
def create_gr8r_graph():
    graph = StateGraph(GradingState)

    # Add nodes
    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("math_grader", math_grader_node)
    graph.add_node("english_grader", english_grader_node)
    graph.add_node("evaluator", evaluator_node)

    # Define flow
    graph.add_edge(START, "orchestrator")

    # Fan-out to graders
    graph.add_conditional_edges(
        "orchestrator",
        route_to_graders,
        ["math_grader", "english_grader"]
    )

    # Fan-in to evaluator
    graph.add_edge("math_grader", "evaluator")
    graph.add_edge("english_grader", "evaluator")

    graph.add_edge("evaluator", END)

    # Compile with memory for checkpointing
    memory = MemorySaver()
    return graph.compile(checkpointer=memory)

# Main execution
async def grade_answer(
    student_id: str,
    question_id: str,
    question_text: str,
    handwritten_answer: str,
    max_score: float = 10.0
) -> dict:
    """Grade a single answer through the Gr8r system"""

    gr8r_graph = create_gr8r_graph()

    input_state = {
        "student_id": student_id,
        "question_id": question_id,
        "question_text": question_text,
        "handwritten_answer": handwritten_answer,
        "max_score": max_score,
        "subject_tags": [],
        "assigned_graders": [],
        "grading_results": []
    }

    config = {"configurable": {"thread_id": f"{student_id}_{question_id}"}}

    with session_start() as session_id:
        result = await gr8r_graph.ainvoke(input_state, config)

    return {
        "student_id": result["student_id"],
        "question_id": result["question_id"],
        "final_score": result["final_score"],
        "max_score": result["max_score"],
        "feedback": result["aggregated_feedback"],
        "confidence": result["confidence_score"],
        "detailed_results": result["grading_results"]
    }

# Example usage
if __name__ == "__main__":
    result = asyncio.run(grade_answer(
        student_id="STU001",
        question_id="Q001",
        question_text="Solve the quadratic equation: x^2 - 5x + 6 = 0",
        handwritten_answer="x^2 - 5x + 6 = 0\n(x-2)(x-3) = 0\nx = 2 or x = 3",
        max_score=10.0
    ))

    print(f"Final Score: {result['final_score']}/{result['max_score']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Feedback:\n{result['feedback']}")
```

### Distributed Agent Communication Example

```python
"""
Example: Distributed Grading with AGNTCY App SDK
"""

from agntcy_app_sdk.factory import AgntcyFactory

async def setup_distributed_grading():
    factory = AgntcyFactory()

    # Create SLIM transport for secure messaging
    transport = factory.create_transport(
        transport="SLIM",
        endpoint="http://localhost:46357",
        name="gr8r/grading/orchestrator"
    )

    # Connect to specialized grader agents via A2A
    math_grader_client = await factory.create_client(
        "A2A",
        agent_topic="gr8r/graders/math",
        transport=transport
    )

    english_grader_client = await factory.create_client(
        "A2A",
        agent_topic="gr8r/graders/english",
        transport=transport
    )

    return {
        "math": math_grader_client,
        "english": english_grader_client
    }

async def grade_distributed(answer: dict, grader_clients: dict):
    """Grade using distributed specialized agents"""

    subject = answer.get("subject", "math")
    client = grader_clients.get(subject)

    if not client:
        raise ValueError(f"No grader available for subject: {subject}")

    # Send grading task via A2A protocol
    task = await client.send_task({
        "method": "grade",
        "params": {
            "question": answer["question"],
            "answer": answer["answer_text"],
            "max_score": answer["max_score"]
        }
    })

    # Wait for result (supports streaming for long-running tasks)
    result = await client.get_task_result(task.id)

    return result
```

---

## 8. Observability and Debugging

### Observe SDK Integration

The AGNTCY Observe SDK provides OpenTelemetry-compliant tracing for multi-agent systems.

#### Installation

```bash
pip install ioa_observe_sdk
```

**Note**: Package uses underscores for installation (`ioa_observe_sdk`) but underscores in imports (`ioa_observe`).

#### Basic Setup

```python
import os
from ioa_observe.sdk import Observe
from ioa_observe.sdk.decorators import agent, graph, tool
from ioa_observe.sdk.tracing import session_start

# Initialize observability
Observe.init(
    app_name="gr8r_grading_system",
    api_endpoint=os.getenv("OTLP_HTTP_ENDPOINT", "http://localhost:4318")
)
```

#### Decorators for Instrumentation

```python
@graph(name="grading_workflow")
def create_grading_graph():
    """Captures MAS topology state for observability"""
    pass

@agent(name="math_grader", description="Grades mathematical answers")
async def math_grader(state):
    """Tracks individual agent nodes and activities"""
    pass

@tool(name="rubric_calculator", description="Calculates weighted rubric scores")
def calculate_rubric_score(scores: dict, weights: dict):
    """Monitors tool usage and performance"""
    pass
```

#### Session Tracking

```python
async def grade_with_tracing(answer: dict):
    with session_start() as session_id:
        # All operations within this context are traced
        result = await grading_graph.ainvoke(answer)

        # Session ID enables end-to-end trace correlation
        print(f"Session: {session_id}")

    return result
```

### Supported Protocol Tracing

The Observe SDK instruments:
- **A2A**: Agent-to-agent communication
- **SLIM**: Secure messaging interactions
- **MCP**: Model Context Protocol tool calls

### Backend Configuration

AGNTCY recommends:
- **ClickHouse**: Time-series database for trace storage
- **OpenTelemetry Collector**: Vendor-agnostic data receiver
- **Grafana**: Visualization layer

```yaml
# docker-compose.yaml for observability stack
version: '3.8'
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4318:4318"  # OTLP HTTP
      - "4317:4317"  # OTLP gRPC

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
```

### Debugging Multi-Agent Workflows

```python
# Enable detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Query traces in ClickHouse
# SELECT * FROM otel_traces WHERE service_name = 'gr8r_grading_system' LIMIT 10;

# Use LangGraph's built-in debugging
from langgraph.debug import visualize

graph = create_gr8r_graph()
visualize(graph)  # Generates visual representation of graph structure
```

---

## 9. Recommendations for Gr8r Implementation

### Architecture Recommendation

Based on this research, here is the recommended architecture for Gr8r:

```
+------------------+
|   OCR Service    |  (Extracts text from handwritten answers)
+--------+---------+
         |
         v
+--------+---------+
|   Orchestrator   |  (LangGraph Supervisor with Claude)
|     Agent        |  - Analyzes questions
+--------+---------+  - Assigns subject tags
         |            - Routes to graders
         v
+--------+---------+---------+---------+
|        |         |         |         |
v        v         v         v         v
+------+ +------+ +------+ +------+ +------+
| Math | |English| |Science| |History| | ... |
|Grader| |Grader | |Grader | |Grader | |     |
+------+ +------+ +------+ +------+ +------+
   |        |         |         |        |
   +--------+---------+---------+--------+
                      |
                      v
            +------------------+
            |    Evaluator     |  (Aggregates results)
            |      Agent       |  - Validates consistency
            +--------+---------+  - Calculates final score
                     |
                     v
            +------------------+
            |  Feedback Loop   |  (Optional)
            |  (if low conf.)  |
            +------------------+
```

### Technology Stack

| Component | Recommendation |
|-----------|----------------|
| **LLM** | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) |
| **Orchestration** | LangGraph with supervisor-worker pattern |
| **SDK** | AGNTCY Application SDK (`agntcy-app-sdk`) |
| **Communication** | A2A protocol over SLIM transport |
| **Observability** | AGNTCY Observe SDK (`ioa_observe_sdk`) |
| **State Management** | LangGraph checkpointer with MemorySaver |

### Implementation Phases

#### Phase 1: Core Orchestration
1. Set up LangGraph supervisor-worker architecture
2. Implement orchestrator agent with subject tagging
3. Create 2-3 specialized grader agents (Math, English, Science)
4. Build evaluator agent for result aggregation

#### Phase 2: Multi-Agent Communication
1. Integrate AGNTCY Application SDK
2. Configure SLIM transport for secure messaging
3. Implement A2A protocol for distributed agents
4. Add agent discovery via OASF registration

#### Phase 3: Observability and Refinement
1. Integrate Observe SDK with decorators
2. Set up ClickHouse + Grafana stack
3. Implement feedback loops for low-confidence grades
4. Add retry logic with checkpointing

#### Phase 4: Scale and Optimize
1. Implement map-reduce for batch grading
2. Add parallel processing with fan-out/fan-in
3. Optimize prompts based on telemetry data
4. Implement identity-based access control

### Key Design Decisions

1. **Use LangGraph's Native Supervisor Pattern**: More control over context engineering than pre-built libraries

2. **Implement Fan-Out for Parallel Grading**: Grade multiple rubric dimensions simultaneously

3. **Use Annotated State with Reducers**: Handle parallel state updates correctly

4. **Enable Checkpointing**: Support retry and resume for long-running grading tasks

5. **Instrument Everything**: Use Observe SDK decorators on all agents and tools

6. **Design for Extensibility**: Easy to add new subject graders via OASF registration

---

## References and Resources

### Official Documentation
- AGNTCY Documentation: https://docs.agntcy.org/
- AGNTCY GitHub: https://github.com/agntcy
- ACP Specification: https://spec.acp.agntcy.org/
- SLIM Specification: https://spec.slim.agntcy.org/

### SDKs and Packages
- Application SDK: https://github.com/agntcy/app-sdk
- ACP SDK: https://pypi.org/project/agntcy-acp/
- Observe SDK: https://github.com/agntcy/observe

### Reference Implementations
- CoffeeAgntcy: https://github.com/agntcy/coffeeAgntcy
- Getting Started Guide: https://docs.agntcy.org/coffee-agntcy/get-started/

### LangGraph Resources
- LangGraph Documentation: https://docs.langchain.com/oss/python/langgraph/workflows-agents
- Supervisor Pattern: https://github.com/langchain-ai/langgraph-supervisor-py
- Multi-Agent Guide: https://www.blog.langchain.com/how-and-when-to-build-multi-agent-systems/

### Related Protocols
- A2A Protocol: https://a2a-protocol.org/
- Model Context Protocol (MCP): https://spec.mcp.io/

---

*Report generated: January 31, 2026*
*Research conducted for Gr8r Multi-Agent Grading System*
