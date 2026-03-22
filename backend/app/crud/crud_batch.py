from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models.org import Batch
from app.schemas.batch import BatchCreate

from sqlalchemy import func
from app.models.org import Batch, Enrollment

class CRUDBatch(CRUDBase[Batch, BatchCreate, BatchCreate]):
    def get_by_org(self, db: Session, *, org_id: UUID) -> List[Batch]:
        """Get all batches for a specific organization with student counts."""
        query = (
            select(
                Batch.id,
                Batch.org_id,
                Batch.name,
                Batch.created_at,
                func.count(Enrollment.id).label("student_count")
            )
            .outerjoin(Enrollment, Enrollment.batch_id == Batch.id)
            .where(Batch.org_id == org_id)
            .where(Batch.deleted_at == None)
            .group_by(Batch.id)
        )
        return db.exec(query).all()

batch = CRUDBatch(Batch)
