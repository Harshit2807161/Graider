"""Test script for the grading pipeline."""

import asyncio
import httpx
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"


async def test_full_pipeline():
    """Test the complete upload and grading flow."""

    async with httpx.AsyncClient(timeout=120.0) as client:
        print("\n=== Gr8r Pipeline Test ===\n")

        # 1. Test root endpoint
        print("1. Testing root endpoint...")
        resp = await client.get(f"{BASE_URL}/")
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")

        # 2. Test health endpoint
        print("\n2. Testing health endpoint...")
        resp = await client.get(f"{BASE_URL}/health")
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")

        # 3. Create a test image (simple PNG)
        print("\n3. Creating test question paper image...")
        test_dir = Path("tests/fixtures")
        test_dir.mkdir(parents=True, exist_ok=True)

        # Create a minimal valid PNG (1x1 white pixel)
        # PNG signature + IHDR + IDAT + IEND
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 image
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])

        question_img = test_dir / "test_question.png"
        question_img.write_bytes(png_data)
        print(f"   Created: {question_img}")

        answer_img = test_dir / "test_answer.png"
        answer_img.write_bytes(png_data)
        print(f"   Created: {answer_img}")

        # Create a text rubric
        rubric_txt = test_dir / "test_rubric.txt"
        rubric_txt.write_text("""
Q1: What is 2 + 2?
Expected Answer: 4
Max Score: 5
Scoring: Full marks for correct answer, partial for showing work

Q2: Explain photosynthesis.
Expected Answer: Photosynthesis is the process by which plants convert sunlight, water, and CO2 into glucose and oxygen.
Max Score: 10
Key Points: sunlight, chlorophyll, glucose, oxygen, carbon dioxide
""")
        print(f"   Created: {rubric_txt}")

        # 4. Upload question paper
        print("\n4. Uploading question paper...")
        with open(question_img, "rb") as f:
            files = {"files": ("question.png", f, "image/png")}
            resp = await client.post(f"{BASE_URL}/api/upload/questions", files=files)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        print(f"   Response: {data}")
        session_id = data.get("session_id")
        print(f"   Session ID: {session_id}")

        if not session_id:
            print("   ERROR: No session ID returned!")
            return

        # 5. Upload answer sheet
        print("\n5. Uploading answer sheet...")
        with open(answer_img, "rb") as f:
            files = {"files": ("answer.png", f, "image/png")}
            data_fields = {"session_id": session_id}
            resp = await client.post(
                f"{BASE_URL}/api/upload/answers",
                files=files,
                data=data_fields
            )
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")

        # 6. Upload rubric
        print("\n6. Uploading rubric...")
        with open(rubric_txt, "rb") as f:
            files = {"files": ("rubric.txt", f, "text/plain")}
            data_fields = {"session_id": session_id}
            resp = await client.post(
                f"{BASE_URL}/api/upload/rubric",
                files=files,
                data=data_fields
            )
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")

        # 7. Check status
        print("\n7. Checking status...")
        resp = await client.get(f"{BASE_URL}/api/status/{session_id}")
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")

        # 8. Trigger grading (this will fail with test images, but tests the endpoint)
        print("\n8. Triggering grading...")
        resp = await client.post(
            f"{BASE_URL}/api/grade",
            json={"session_id": session_id}
        )
        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.json()}")

        # 9. Poll status
        print("\n9. Polling status (waiting for grading)...")
        for i in range(5):
            await asyncio.sleep(2)
            resp = await client.get(f"{BASE_URL}/api/status/{session_id}")
            status_data = resp.json()
            print(f"   [{i+1}] Status: {status_data.get('status')}, Progress: {status_data.get('progress')}%")
            if status_data.get("status") in ["completed", "failed"]:
                break

        # 10. Get results
        print("\n10. Getting results...")
        resp = await client.get(f"{BASE_URL}/api/results/{session_id}")
        print(f"   Status: {resp.status_code}")
        result = resp.json()
        print(f"   Response: {json.dumps(result, indent=2)}")

        print("\n=== Test Complete ===\n")


if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
