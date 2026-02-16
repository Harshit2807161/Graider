from uuid import UUID
from pydantic import BaseModel

class BatchCreate(BaseModel):
    org_id: UUID
    name: str

class BatchRead(BaseModel):
    id: UUID
    org_id: UUID
    name: str

class EnrollmentCreate(BaseModel):
    email: str # Enroll by email
