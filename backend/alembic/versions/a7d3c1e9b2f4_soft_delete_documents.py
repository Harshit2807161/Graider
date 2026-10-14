"""soft delete for documents

Exam documents no confirmed draft uses can be removed (soft delete; the file stays).

Revision ID: a7d3c1e9b2f4
Revises: e825baa9c8d0
Create Date: 2026-10-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a7d3c1e9b2f4'
down_revision: Union[str, Sequence[str], None] = 'e825baa9c8d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('documents', sa.Column('deleted_at', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True))
    op.create_index(op.f('ix_documents_deleted_at'), 'documents', ['deleted_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_documents_deleted_at'), table_name='documents')
    op.drop_column('documents', 'deleted_at')
