"""Student display names for lists of submissions."""

from typing import Optional
from uuid import UUID

from sqlmodel import Session, col, select

from app.models.user import Membership, User


def student_names(db: Session, membership_ids: list[Optional[UUID]]) -> dict[UUID, str]:
    """Full name per student membership id (one query; unknown ids are left out)."""
    ids = {i for i in membership_ids if i is not None}
    if not ids:
        return {}
    rows = db.exec(select(Membership.id, User.full_name).join(User, col(User.id) == Membership.user_id)
                   .where(col(Membership.id).in_(ids))).all()
    return dict(rows)  # type: ignore[arg-type]
