import os
import time
import requests
from pathlib import Path

# Important: Make sure both Uvicorn and Celery are running before executing this!
# Celery run command: celery -A app.worker.celery_app worker --loglevel=info

BASE_URL = "http://localhost:8000/api/v1"
TEST_EXAM_ID = "YOUR_EXAM_UUID_HERE" # Replace with a valid exam UUID from your database
TEST_FILE_PATH = "sample_submission.pdf" # Provide a simple PDF or image

def create_dummy_file():
    """Create a temporary test file if one isn't provided."""
    if not os.path.exists(TEST_FILE_PATH):
        with open(TEST_FILE_PATH, "w") as f:
            f.write("This is a dummy student answer sheet for testing Celery async pipeline.")
        print(f"Created {TEST_FILE_PATH}")

def test_submission():
    create_dummy_file()
    
    upload_url = f"{BASE_URL}/submissions/exams/{TEST_EXAM_ID}/submissions"
    
    print(f"Uploading file to {upload_url}...")
    
    with open(TEST_FILE_PATH, "rb") as f:
        # We need a proper user token if authentication is enabled on the endpoint
        # Use headers={"Authorization": "Bearer <token>"} if auth is required
        
        # NOTE: For this to work seamlessly without auth errors, you may need to 
        # mock the auth or use an active session token if `get_current_user` is strict.
        
        response = requests.post(
            upload_url,
            files={"file": (TEST_FILE_PATH, f, "application/pdf")}
        )
    
    if response.status_code == 200:
        data = response.json()
        submission_id = data["id"]
        print(f"Success! Submission created with ID: {submission_id}")
        print("The Celery worker should now have picked up the 'grade_exam_task' event.")
        
        # Poll for status
        for _ in range(5):
            print(f"Polling status for submission {submission_id}...")
            time.sleep(3)
            # You can GET the submission endpoint to see if status="processing" or "completed"
            # get_response = requests.get(f"{BASE_URL}/submissions/{submission_id}")
            # print(get_response.json()["status"])
    else:
        print(f"Failed with status {response.status_code}: {response.text}")

if __name__ == "__main__":
    print("--- Testing Graider Async Evaluation Pipeline ---")
    test_submission()
