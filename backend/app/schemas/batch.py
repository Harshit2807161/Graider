from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

class BatchCreate(BaseModel):
    org_id: UUID
    name: str

class BatchRead(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    created_at: datetime
    student_count: int = 0

class EnrollmentCreate(BaseModel):
    email: str # Enroll by email

class StudentRead(BaseModel):
    id: UUID  # user id
    membership_id: UUID  # use this as student_id when uploading a submission
    full_name: str
    email: str
    enrolled_at: datetime
