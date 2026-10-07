from enum import Enum

class Role(str, Enum):
    OWNER = "owner"     # Organization Owner (Can delete org, manage user roles)
    ADMIN = "admin"     # Organization Admin (Can manage users, exams)
    TEACHER = "teacher" # Can create exams, grade
    STUDENT = "student" # Can take exams, view results

class ExamStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class SubmissionStatus(str, Enum):
    PENDING = "PENDING"   # Uploaded, waiting for processing
    PROCESSING = "PROCESSING" # OCR/AI in progress
    GRADED = "GRADED"     # AI completed, waiting review
    NEEDS_REVIEW = "NEEDS_REVIEW"  # graded, but some answers were escalated to the teacher
    FAILED = "FAILED"     # Pipeline error
    APPROVED = "APPROVED" # Teacher reviewed
    PUBLISHED = "PUBLISHED" # Visible to student

class QuestionType(str, Enum):
    DESCRIPTIVE = "descriptive"
    MCQ = "mcq"
    PROBLEM = "problem"
