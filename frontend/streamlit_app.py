"""Streamlit frontend for Gr8r grading system."""

import time
import requests
import streamlit as st
from pathlib import Path

# Configuration
API_BASE_URL = "http://127.0.0.1:8000"

st.set_page_config(
    page_title="Gr8r - AI Grading System",
    page_icon="📝",
    layout="wide",
)

# Custom CSS
st.markdown("""
<style>
    .score-excellent { color: #22c55e; font-weight: bold; }
    .score-good { color: #84cc16; font-weight: bold; }
    .score-fair { color: #eab308; font-weight: bold; }
    .score-poor { color: #ef4444; font-weight: bold; }
    .stProgress > div > div > div > div { background-color: #6366f1; }
</style>
""", unsafe_allow_html=True)


def check_server_health():
    """Check if the backend server is running."""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException as e:
        st.error(f"Connection error: {e}")
        return False


def upload_combined(session_id: str, file) -> tuple[bool, str]:
    """Upload combined document. Returns (success, session_id)."""
    # Determine content type from file extension
    content_type = "application/pdf" if file.name.lower().endswith(".pdf") else "application/octet-stream"
    files = {"files": (file.name, file.getvalue(), content_type)}
    data = {"session_id": session_id} if session_id else {}
    response = requests.post(
        f"{API_BASE_URL}/api/upload/combined",
        files=files,
        data=data,
    )
    if response.status_code == 200:
        return True, response.json().get("session_id", session_id)
    return False, session_id


def upload_questions(session_id: str, file) -> tuple[bool, str]:
    """Upload question paper. Returns (success, session_id)."""
    content_type = "application/pdf" if file.name.lower().endswith(".pdf") else "application/octet-stream"
    files = {"files": (file.name, file.getvalue(), content_type)}
    data = {"session_id": session_id} if session_id else {}
    response = requests.post(
        f"{API_BASE_URL}/api/upload/questions",
        files=files,
        data=data,
    )
    if response.status_code == 200:
        return True, response.json().get("session_id", session_id)
    return False, session_id


def upload_answers(session_id: str, file) -> bool:
    """Upload answer sheet."""
    content_type = "application/pdf" if file.name.lower().endswith(".pdf") else "application/octet-stream"
    files = {"files": (file.name, file.getvalue(), content_type)}
    data = {"session_id": session_id}
    response = requests.post(
        f"{API_BASE_URL}/api/upload/answers",
        files=files,
        data=data,
    )
    return response.status_code == 200


def upload_rubric(session_id: str, file) -> bool:
    """Upload rubric."""
    # Determine content type from file extension
    ext = file.name.lower().split(".")[-1] if "." in file.name else ""
    content_types = {
        "pdf": "application/pdf",
        "txt": "text/plain",
        "md": "text/markdown",
        "json": "application/json",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
    }
    content_type = content_types.get(ext, "application/octet-stream")
    files = {"files": (file.name, file.getvalue(), content_type)}
    data = {"session_id": session_id}
    response = requests.post(
        f"{API_BASE_URL}/api/upload/rubric",
        files=files,
        data=data,
    )
    return response.status_code == 200


def start_grading(session_id: str) -> dict:
    """Start the grading pipeline."""
    response = requests.post(
        f"{API_BASE_URL}/api/grade",
        json={"session_id": session_id},
    )
    return response.json()


def get_status(session_id: str) -> dict:
    """Get grading status."""
    response = requests.get(f"{API_BASE_URL}/api/status/{session_id}")
    return response.json()


def get_results(session_id: str) -> dict:
    """Get grading results."""
    response = requests.get(f"{API_BASE_URL}/api/results/{session_id}")
    return response.json()


def get_score_class(percentage: float) -> str:
    """Get CSS class based on score percentage."""
    if percentage >= 90:
        return "score-excellent"
    elif percentage >= 75:
        return "score-good"
    elif percentage >= 60:
        return "score-fair"
    else:
        return "score-poor"


def main():
    st.title("📝 Gr8r - AI-Powered Grading System")
    st.markdown("Upload documents to grade handwritten answers using AI.")

    # Check server health
    if not check_server_health():
        st.error("⚠️ Backend server is not running. Please start the server with:")
        st.code("cd backend && python -m uvicorn app.main:app --reload --port 8000")
        return

    st.success("✅ Backend server is running")

    # Sidebar for configuration
    with st.sidebar:
        st.header("📁 Upload Documents")

        upload_mode = st.radio(
            "Upload Mode",
            ["Combined (Questions + Answers)", "Separate Files"],
            help="Choose 'Combined' if your PDF has both questions and answers together"
        )

        st.divider()

        if upload_mode == "Combined (Questions + Answers)":
            combined_file = st.file_uploader(
                "Combined Document",
                type=["pdf"],
                help="Upload a PDF containing both questions and answers",
                key="combined"
            )
            questions_file = None
            answers_file = None
        else:
            combined_file = None
            questions_file = st.file_uploader(
                "Question Paper",
                type=["pdf"],
                help="Upload the question paper PDF",
                key="questions"
            )
            answers_file = st.file_uploader(
                "Answer Sheet",
                type=["pdf"],
                help="Upload the student's answer sheet PDF",
                key="answers"
            )

        st.divider()

        rubric_file = st.file_uploader(
            "Rubric (Optional)",
            type=["pdf", "txt"],
            help="Upload grading rubric for more accurate scoring",
            key="rubric"
        )

        st.divider()

        grade_button = st.button("🚀 Start Grading", type="primary", use_container_width=True)

    # Main content area
    if grade_button:
        # Validate inputs
        if upload_mode == "Combined (Questions + Answers)" and not combined_file:
            st.error("Please upload a combined document.")
            return
        elif upload_mode == "Separate Files" and (not questions_file or not answers_file):
            st.error("Please upload both question paper and answer sheet.")
            return

        # Session will be created by the first upload
        session_id = None

        with st.status("Processing...", expanded=True) as status:
            # Upload files
            st.write("📤 Uploading files...")

            if combined_file:
                success, session_id = upload_combined(session_id, combined_file)
                if not success:
                    st.error("Failed to upload combined document")
                    return
                st.write(f"  ✅ Uploaded: {combined_file.name}")
            else:
                success, session_id = upload_questions(session_id, questions_file)
                if not success:
                    st.error("Failed to upload question paper")
                    return
                st.write(f"  ✅ Uploaded questions: {questions_file.name}")

                if not upload_answers(session_id, answers_file):
                    st.error("Failed to upload answer sheet")
                    return
                st.write(f"  ✅ Uploaded answers: {answers_file.name}")

            if rubric_file:
                if not upload_rubric(session_id, rubric_file):
                    st.error("Failed to upload rubric")
                    return
                st.write(f"  ✅ Uploaded rubric: {rubric_file.name}")

            # Start grading
            st.write("🎯 Starting grading pipeline...")
            result = start_grading(session_id)

            # Check if grading started (status will be processing, not "failed")
            if result.get("status") == "failed" or "error" in result:
                st.error(f"Failed to start grading: {result}")
                return

            st.write(f"  ✅ Grading started (session: {session_id[:8]}...)")

            # Poll for progress
            progress_bar = st.progress(0)
            status_text = st.empty()

            while True:
                status_data = get_status(session_id)
                current_status = status_data.get("status", "unknown")
                progress = status_data.get("progress", 0)
                step = status_data.get("current_step", "Processing...")

                progress_bar.progress(int(progress))
                status_text.write(f"📊 {step} ({progress:.1f}%)")

                if current_status == "completed":
                    status.update(label="✅ Grading Complete!", state="complete", expanded=False)
                    break
                elif current_status == "failed":
                    error_msg = status_data.get("error_message", "Unknown error")
                    status.update(label="❌ Grading Failed", state="error")
                    st.error(f"Error: {error_msg}")
                    return

                time.sleep(2)

        # Fetch and display results
        st.divider()
        st.header("📊 Grading Results")

        results_data = get_results(session_id)

        if "error" in results_data:
            st.error(f"Error fetching results: {results_data['error']}")
            return

        results = results_data.get("results", [])
        total_score = results_data.get("total_score", 0)
        max_total = results_data.get("max_total_score", 0)
        summary = results_data.get("summary", "")

        # Summary metrics
        percentage = (total_score / max_total * 100) if max_total > 0 else 0

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Score", f"{total_score:.1f}/{max_total:.1f}")
        with col2:
            st.metric("Percentage", f"{percentage:.1f}%")
        with col3:
            st.metric("Questions", len(results))
        with col4:
            avg_confidence = sum(r.get("confidence", 0) for r in results) / len(results) if results else 0
            st.metric("Avg Confidence", f"{avg_confidence:.0%}")

        st.info(f"📝 {summary}")

        # Individual results
        st.subheader("Question Breakdown")

        for i, result in enumerate(results):
            q_id = result.get("question_id", f"Q{i+1}")
            score = result.get("score", 0)
            max_score = result.get("max_score", 1)
            q_percentage = (score / max_score * 100) if max_score > 0 else 0
            grader = result.get("grader", "unknown")
            confidence = result.get("confidence", 0)
            reasoning = result.get("reasoning", "")
            feedback = result.get("feedback", "")

            score_class = get_score_class(q_percentage)

            with st.expander(f"Question {q_id} — {score:.1f}/{max_score:.1f} ({q_percentage:.0f}%)"):
                col1, col2, col3 = st.columns([2, 1, 1])
                with col1:
                    st.markdown(f"**Grader:** `{grader}`")
                with col2:
                    st.markdown(f"**Confidence:** {confidence:.0%}")
                with col3:
                    if q_percentage >= 90:
                        st.success("Excellent")
                    elif q_percentage >= 75:
                        st.info("Good")
                    elif q_percentage >= 60:
                        st.warning("Fair")
                    else:
                        st.error("Needs Work")

                st.markdown("**Reasoning:**")
                st.markdown(f"> {reasoning}")

                st.markdown("**Feedback:**")
                st.markdown(f"> {feedback}")

        # Download results
        st.divider()
        import json
        results_json = json.dumps(results_data, indent=2)
        st.download_button(
            label="📥 Download Results (JSON)",
            data=results_json,
            file_name=f"grading_results_{session_id[:8]}.json",
            mime="application/json"
        )

    else:
        # Show instructions when not grading
        st.markdown("""
        ### How to Use

        1. **Choose upload mode** in the sidebar:
           - **Combined**: If your PDF has questions and answers together
           - **Separate**: If you have separate question paper and answer sheet

        2. **Upload your files**:
           - Question paper / Combined document
           - Answer sheet (if separate)
           - Rubric (optional, but improves accuracy)

        3. **Click "Start Grading"** and wait for results

        ---

        ### Features

        - 🤖 **AI-Powered OCR**: Extracts text from handwritten documents
        - 📊 **Multi-Agent Grading**: Specialized graders for Math, Science, English, etc.
        - 📝 **Detailed Feedback**: Get reasoning and improvement suggestions
        - 📈 **Confidence Scores**: Know how certain the AI is about each grade
        """)


if __name__ == "__main__":
    main()
