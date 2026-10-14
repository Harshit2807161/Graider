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

class FailureCode(str, Enum):
    """Why a grading run left a submission FAILED (stored on `submissions.failure_code`)."""
    PAGES_UNREADABLE = "pages_unreadable"  # the file or its pages couldn't be read
    BUDGET_EXHAUSTED = "budget_exhausted"  # the per-submission call/cost budget ran out
    NO_QUESTIONS = "no_questions"  # the exam had no questions
    MODEL_UNAVAILABLE = "model_unavailable"  # every model target failed outside page reading
    INTERNAL_ERROR = "internal_error"  # anything else

class QuestionType(str, Enum):
    DESCRIPTIVE = "descriptive"
    MCQ = "mcq"
    PROBLEM = "problem"
