from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Field, Relationship, JSON, Column

from app.models.base import Base
from app.core.constants import ExamStatus, SubmissionStatus, QuestionType

if TYPE_CHECKING:
    from app.models.org import Organization, Batch
    from app.models.user import Membership

# 7. Question
class Question(Base, table=True):
    __tablename__ = "questions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    exam_id: UUID = Field(foreign_key="exams.id")
    
    question_text: str
    order_index: int
    max_score: float
    rubric_criteria: Optional[str] = None
    question_type: QuestionType = Field(default=QuestionType.DESCRIPTIVE)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    exam: "Exam" = Relationship(back_populates="questions")
    submission_answers: List["SubmissionAnswer"] = Relationship(back_populates="question")

# 6. Exam
class Exam(Base, table=True):
    __tablename__ = "exams"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id")
    batch_id: Optional[UUID] = Field(default=None, foreign_key="batches.id")
    created_by_membership_id: UUID = Field(foreign_key="memberships.id")
    
    name: str
    status: ExamStatus = Field(default=ExamStatus.DRAFT)
    config: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    organization: "Organization" = Relationship(back_populates="exams")
    batch: Optional["Batch"] = Relationship(back_populates="exams")
    created_by: "Membership" = Relationship(back_populates="exams_created")
    questions: List[Question] = Relationship(back_populates="exam")
    submissions: List["Submission"] = Relationship(back_populates="exam")

# 9. Submission Answer (Granular)
class SubmissionAnswer(Base, table=True):
    __tablename__ = "submission_answers"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    submission_id: UUID = Field(foreign_key="submissions.id")
    question_id: UUID = Field(foreign_key="questions.id")
    
    student_answer_text: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    reasoning: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    submission: "Submission" = Relationship(back_populates="answers")
    question: Question = Relationship(back_populates="submission_answers")

# 8. Submission
class Submission(Base, table=True):
    __tablename__ = "submissions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    exam_id: UUID = Field(foreign_key="exams.id")
    student_membership_id: Optional[UUID] = Field(default=None, foreign_key="memberships.id")
    
    original_file_url: str
    graded_file_url: Optional[str] = None
    
    total_score: Optional[float] = None
    max_score: Optional[float] = None
    percentage: Optional[float] = None
    
    status: SubmissionStatus = Field(default=SubmissionStatus.PENDING) 
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    exam: Exam = Relationship(back_populates="submissions")
    student_membership: Optional["Membership"] = Relationship(back_populates="submissions")
    answers: List[SubmissionAnswer] = Relationship(back_populates="submission")
