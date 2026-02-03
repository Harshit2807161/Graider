#!/usr/bin/env python
"""
Test client for Gr8r grading pipeline.

This script allows you to test the full grading pipeline by:
1. Uploading question paper images/PDFs
2. Uploading answer sheet images/PDFs
3. Uploading rubric (text, image, or PDF)
4. Triggering grading
5. Polling for results

Supports:
- Separate question and answer documents
- Combined documents (questions + answers in same file)
- PDF and image inputs
- Mixed handwritten and printed text

Usage:
    # Separate documents
    python test_client.py --questions path/to/questions.pdf --answers path/to/answers.pdf --rubric path/to/rubric.txt

    # Combined document (questions and answers together)
    python test_client.py --combined path/to/worksheet.pdf --rubric path/to/rubric.txt

    # Interactive mode
    python test_client.py
"""

import argparse
import asyncio
import glob
import json
import sys
import time
from pathlib import Path

import httpx

BASE_URL = "http://127.0.0.1:8000"


async def upload_files(
    client: httpx.AsyncClient,
    endpoint: str,
    file_paths: list[str],
    session_id: str = None
) -> dict:
    """Upload files to an endpoint."""
    files = []
    opened_files = []

    for path in file_paths:
        p = Path(path)
        if p.exists():
            # Determine content type based on extension
            ext = p.suffix.lower()
            content_type_map = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".pdf": "application/pdf",
                ".txt": "text/plain",
                ".md": "text/markdown",
                ".json": "application/json",
            }
            content_type = content_type_map.get(ext, "application/octet-stream")

            f = open(p, "rb")
            opened_files.append(f)
            files.append(("files", (p.name, f, content_type)))
        else:
            print(f"   WARNING: File not found: {path}")

    if not files:
        return {"error": "No valid files to upload"}

    data = {}
    if session_id:
        data["session_id"] = session_id

    try:
        response = await client.post(
            f"{BASE_URL}{endpoint}",
            files=files,
            data=data,
            timeout=120.0  # Longer timeout for large PDFs
        )

        # Check for HTTP errors
        if response.status_code == 404:
            return {"error": f"Endpoint not found: {endpoint}. Make sure the server is restarted."}
        elif response.status_code == 422:
            detail = response.json().get("detail", "Validation error")
            return {"error": f"Validation error: {detail}"}
        elif response.status_code >= 400:
            return {"error": f"HTTP {response.status_code}: {response.text[:200]}"}

        return response.json()
    except Exception as e:
        return {"error": f"Request failed: {str(e)}"}
    finally:
        # Close file handles
        for f in opened_files:
            f.close()


async def trigger_grading(client: httpx.AsyncClient, session_id: str) -> dict:
    """Trigger the grading pipeline."""
    try:
        response = await client.post(
            f"{BASE_URL}/api/grade",
            json={"session_id": session_id},
            timeout=120.0  # Increased timeout for slow responses
        )
        if response.status_code >= 400:
            return {"error": f"HTTP {response.status_code}: {response.text[:200]}"}
        return response.json()
    except httpx.ReadTimeout:
        return {"error": "Request timed out waiting for grade response (>120s)"}
    except Exception as e:
        error_msg = str(e) if str(e) else f"{type(e).__name__}: {repr(e)}"
        return {"error": error_msg}


async def poll_status(client: httpx.AsyncClient, session_id: str, retry_on_timeout: bool = True) -> dict:
    """Poll for grading status."""
    try:
        response = await client.get(
            f"{BASE_URL}/api/status/{session_id}",
            timeout=10.0  # Short timeout, we'll retry
        )
        if response.status_code >= 400:
            return {"error": f"HTTP {response.status_code}: {response.text[:200]}", "status": "failed"}
        return response.json()
    except httpx.ReadTimeout:
        if retry_on_timeout:
            # Server is busy (likely processing), not an error - return unknown status
            return {"status": "processing", "progress": 0, "current_step": "Server busy, retrying..."}
        return {"error": "Server timeout", "status": "failed"}
    except httpx.ConnectError:
        return {"error": "Cannot connect to server fr", "status": "failed"}
    except Exception as e:
        error_msg = str(e) if str(e) else f"{type(e).__name__}: {repr(e)}"
        return {"error": f"Poll error: {error_msg}", "status": "failed"}


async def get_results(client: httpx.AsyncClient, session_id: str) -> dict:
    """Get final grading results."""
    try:
        response = await client.get(
            f"{BASE_URL}/api/results/{session_id}",
            timeout=30.0
        )
        if response.status_code >= 400:
            return {"error": f"HTTP {response.status_code}: {response.text[:200]}"}
        return response.json()
    except Exception as e:
        return {"error": str(e)}


async def run_pipeline(
    question_files: list[str] = None,
    answer_files: list[str] = None,
    combined_files: list[str] = None,
    rubric_files: list[str] = None
):
    """Run the complete grading pipeline."""

    async with httpx.AsyncClient() as client:
        print("\n" + "=" * 60)
        print("  Gr8r Grading Pipeline Test")
        print("=" * 60 + "\n")

        # 1. Check server health
        print("1. Checking server health...")
        try:
            resp = await client.get(f"{BASE_URL}/health", timeout=5.0)
            if resp.status_code != 200:
                print("   ERROR: Server not healthy")
                return
            print("   OK Server is healthy\n")
        except Exception as e:
            print(f"   ERROR: Cannot connect to server at {BASE_URL}")
            print(f"   Make sure the server is running: uvicorn app.main:app --reload")
            return

        # Determine upload mode
        is_combined = bool(combined_files)

        if is_combined:
            # Combined document mode
            print(f"2. Uploading {len(combined_files)} combined document(s)...")
            result = await upload_files(client, "/api/upload/combined", combined_files)
            if "error" in result:
                print(f"   ERROR: {result['error']}")
                return
            session_id = result.get("session_id")
            if not session_id:
                print(f"   ERROR: No session ID returned. Server response: {result}")
                return
            print(f"   OK Session ID: {session_id}")
            print(f"   OK {result.get('message')}\n")

            print("3. Skipping separate answer upload (using combined document)\n")

        else:
            # Separate documents mode
            print(f"2. Uploading {len(question_files)} question paper(s)...")
            result = await upload_files(client, "/api/upload/questions", question_files)
            if "error" in result:
                print(f"   ERROR: {result['error']}")
                return
            session_id = result.get("session_id")
            if not session_id:
                print(f"   ERROR: No session ID returned. Server response: {result}")
                return
            print(f"   OK Session ID: {session_id}")
            print(f"   OK {result.get('message')}\n")

            # 3. Upload answer sheets
            print(f"3. Uploading {len(answer_files)} answer sheet(s)...")
            result = await upload_files(client, "/api/upload/answers", answer_files, session_id)
            if "error" in result:
                print(f"   ERROR: {result['error']}")
                return
            print(f"   OK {result.get('message')}\n")

        # 4. Upload rubric (optional)
        if rubric_files:
            print(f"4. Uploading {len(rubric_files)} rubric file(s)...")
            result = await upload_files(client, "/api/upload/rubric", rubric_files, session_id)
            if "error" in result:
                print(f"   WARNING: Rubric upload failed: {result['error']}")
            else:
                print(f"   OK {result.get('message')}\n")
        else:
            print("4. Skipping rubric upload (not provided)\n")

        # 5. Trigger grading
        print("5. Triggering grading pipeline...")
        result = await trigger_grading(client, session_id)
        if "error" in result:
            print(f"   ERROR: {result['error']}")
            return
        # Debug: print full result if status is unexpected
        if not result.get('status'):
            print(f"   DEBUG: Full response: {result}")
        print(f"   OK Status: {result.get('status')}")
        print(f"   OK {result.get('message')}\n")

        # 6. Poll for completion
        print("6. Waiting for grading to complete...")
        max_polls = 240  # Max 10 minutes (5 second intervals)
        poll_interval = 5  # seconds

        for i in range(max_polls):
            status = await poll_status(client, session_id)

            # Check for HTTP/network errors (from poll_status error handling)
            if "error" in status and status.get("status") == "failed":
                print(f"   ERROR: {status.get('error')}")
                return

            current_status = status.get("status") or "unknown"
            progress = status.get("progress") or 0
            step = status.get("current_step") or ""
            error_msg = status.get("error_message") or ""

            # Truncate step if too long
            if len(step) > 50:
                step = step[:47] + "..."

            print(f"   [{i+1:3d}] {current_status:12s} {progress:5.1f}% - {step}")

            if current_status == "completed":
                print("   OK Grading complete!\n")
                break
            elif current_status == "failed":
                if error_msg:
                    # Truncate long error messages
                    if len(error_msg) > 200:
                        error_msg = error_msg[:197] + "..."
                    print(f"   FAILED Grading failed: {error_msg}\n")
                else:
                    print(f"   FAILED Grading failed (no error message)\n")
                return

            await asyncio.sleep(poll_interval)
        else:
            print("   TIMEOUT Waiting for grading\n")
            return

        # 7. Get results
        print("7. Fetching results...")
        results = await get_results(client, session_id)

        print("\n" + "=" * 60)
        print("  GRADING RESULTS")
        print("=" * 60 + "\n")

        for r in results.get("results", []):
            percentage = (r.get('score', 0) / r.get('max_score', 1)) * 100 if r.get('max_score') else 0
            print(f"Question: {r.get('question_id')}")
            print(f"  Score: {r.get('score')}/{r.get('max_score')} ({percentage:.1f}%)")
            print(f"  Grader: {r.get('grader')}")
            print(f"  Confidence: {r.get('confidence', 0):.2f}")

            reasoning = r.get('reasoning', '')
            if len(reasoning) > 200:
                reasoning = reasoning[:197] + "..."
            print(f"  Reasoning: {reasoning}")

            feedback = r.get('feedback', '')
            if len(feedback) > 200:
                feedback = feedback[:197] + "..."
            print(f"  Feedback: {feedback}")
            print()

        print("-" * 60)
        total = results.get('total_score', 0)
        max_total = results.get('max_total_score', 0)
        overall_pct = results.get('overall_percentage', 0)
        print(f"TOTAL: {total:.1f}/{max_total:.1f} ({overall_pct:.1f}%)")
        print(f"Summary: {results.get('summary', '')}")
        print("=" * 60 + "\n")


def expand_glob(patterns: list[str]) -> list[str]:
    """Expand glob patterns to file paths."""
    files = []
    for pattern in patterns:
        if "*" in pattern:
            files.extend(glob.glob(pattern))
        else:
            files.append(pattern)
    return files


def main():
    parser = argparse.ArgumentParser(
        description="Test the Gr8r grading pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Separate question and answer documents
  python test_client.py -q questions.pdf -a answers.pdf -r rubric.txt

  # Combined document (questions + answers together)
  python test_client.py --combined worksheet.pdf -r rubric.txt

  # Multiple files with glob patterns
  python test_client.py -q "questions/*.png" -a "answers/*.jpg" -r rubric.pdf

  # Interactive mode
  python test_client.py
        """
    )
    parser.add_argument(
        "--questions", "-q", nargs="+",
        help="Question paper files (images or PDFs)"
    )
    parser.add_argument(
        "--answers", "-a", nargs="+",
        help="Answer sheet files (images or PDFs)"
    )
    parser.add_argument(
        "--combined", "-c", nargs="+",
        help="Combined document files containing both questions and answers"
    )
    parser.add_argument(
        "--rubric", "-r", nargs="*",
        help="Rubric files (text, images, or PDFs)"
    )

    args = parser.parse_args()

    # Interactive mode if no arguments
    if not args.questions and not args.combined:
        print("\nGr8r Grading Pipeline - Interactive Mode")
        print("-" * 40)
        print("\nChoose upload mode:")
        print("  1. Separate documents (question paper + answer sheets)")
        print("  2. Combined document (questions and answers together)")

        mode = input("\nEnter mode (1 or 2): ").strip()

        if mode == "2":
            # Combined mode
            c_path = input("Enter path to combined document (e.g., './worksheet.pdf'): ").strip()
            args.combined = expand_glob([c_path]) if c_path else []
            args.questions = None
            args.answers = None
        else:
            # Separate mode
            q_path = input("Enter path to question paper(s) (e.g., './questions/*.png'): ").strip()
            args.questions = expand_glob([q_path]) if q_path else []

            a_path = input("Enter path to answer sheet(s) (e.g., './answers.pdf'): ").strip()
            args.answers = expand_glob([a_path]) if a_path else []

            args.combined = None

        r_path = input("Enter path to rubric file(s) (optional, press Enter to skip): ").strip()
        args.rubric = expand_glob([r_path]) if r_path else []

    # Validate inputs
    if args.combined:
        # Combined mode
        combined_files = expand_glob(args.combined)
        if not combined_files:
            print("ERROR: No combined document files found")
            sys.exit(1)
        question_files = None
        answer_files = None
    else:
        # Separate mode
        combined_files = None
        question_files = expand_glob(args.questions) if args.questions else []
        answer_files = expand_glob(args.answers) if args.answers else []

        if not question_files:
            print("ERROR: No question paper files specified")
            sys.exit(1)

        if not answer_files:
            print("ERROR: No answer sheet files specified")
            sys.exit(1)

    rubric_files = expand_glob(args.rubric) if args.rubric else []

    # Print summary
    print(f"\nFiles to process:")
    if combined_files:
        print(f"  Combined: {combined_files}")
    else:
        print(f"  Questions: {question_files}")
        print(f"  Answers: {answer_files}")
    print(f"  Rubric: {rubric_files or 'None'}")

    # Run pipeline
    asyncio.run(run_pipeline(
        question_files=question_files,
        answer_files=answer_files,
        combined_files=combined_files,
        rubric_files=rubric_files
    ))


if __name__ == "__main__":
    main()
