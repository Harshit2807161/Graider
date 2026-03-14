from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select, func
from app.crud.base import CRUDBase
from app.models.exam import Exam, Question, Submission, SubmissionAnswer
from app.schemas.exam import ExamCreate, ExamUpdate, QuestionCreate, QuestionUpdate, SubmissionBase, SubmissionAnswerBase

class CRUDExam(CRUDBase[Exam, ExamCreate, ExamUpdate]):
    def get_by_org(self, db: Session, *, org_id: UUID, skip: int = 0, limit: int = 100) -> List[Exam]:
        statement = (
            select(self.model)
            .where(self.model.org_id == org_id)
            .where(self.model.deleted_at == None)
            .offset(skip)
            .limit(limit)
        )
        return db.exec(statement).all()

    def get_by_batch(self, db: Session, *, batch_id: UUID, skip: int = 0, limit: int = 100) -> List[Exam]:
        statement = (
            select(self.model)
            .where(self.model.batch_id == batch_id)
            .where(self.model.deleted_at == None)
            .offset(skip)
            .limit(limit)
        )
        return db.exec(statement).all()

    def get_with_question_count(self, db: Session, *, org_id: UUID, skip: int = 0, limit: int = 100) -> List[dict]:
        """Fetch exams with the count of questions for display."""
        statement = (
            select(Exam, func.count(Question.id).label("question_count"))
            .outerjoin(Question)
            .where(Exam.org_id == org_id)
            .where(Exam.deleted_at == None)
            .group_by(Exam.id)
            .offset(skip)
            .limit(limit)
        )
        results = db.exec(statement).all()
        
        exams_with_counts = []
        for exam, count in results:
            exam_data = exam.model_dump()
            exam_data["question_count"] = count
            exams_with_counts.append(exam_data)
        return exams_with_counts

class CRUDQuestion(CRUDBase[Question, QuestionCreate, QuestionUpdate]):
    def get_by_exam(self, db: Session, *, exam_id: UUID) -> List[Question]:
        statement = (
            select(self.model)
            .where(self.model.exam_id == exam_id)
            .where(self.model.deleted_at == None)
            .order_by(self.model.order_index)
        )
        return db.exec(statement).all()

class CRUDSubmission(CRUDBase[Submission, SubmissionBase, SubmissionBase]):
    def get_by_exam(self, db: Session, *, exam_id: UUID, skip: int = 0, limit: int = 100) -> List[Submission]:
        statement = (
            select(self.model)
            .where(self.model.exam_id == exam_id)
            .where(self.model.deleted_at == None)
            .offset(skip)
            .limit(limit)
        )
        return db.exec(statement).all()

class CRUDSubmissionAnswer(CRUDBase[SubmissionAnswer, SubmissionAnswerBase, SubmissionAnswerBase]):
    def get_by_submission(self, db: Session, *, submission_id: UUID) -> List[SubmissionAnswer]:
        statement = (
            select(self.model)
            .where(self.model.submission_id == submission_id)
            .where(self.model.deleted_at == None)
        )
        return db.exec(statement).all()

exam = CRUDExam(Exam)
question = CRUDQuestion(Question)
submission = CRUDSubmission(Submission)
submission_answer = CRUDSubmissionAnswer(SubmissionAnswer)
