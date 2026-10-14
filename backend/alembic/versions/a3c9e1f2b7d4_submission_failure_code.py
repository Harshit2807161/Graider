"""submission failure code

Why the last grading run left a submission FAILED (app.core.constants.FailureCode), so the UI
doesn't have to match the error text.

Revision ID: a3c9e1f2b7d4
Revises: a7d3c1e9b2f4
Create Date: 2026-10-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401  (autogenerate emits sqlmodel types)


# revision identifiers, used by Alembic.
revision: str = 'a3c9e1f2b7d4'
down_revision: Union[str, Sequence[str], None] = 'a7d3c1e9b2f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('submissions', sa.Column('failure_code', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('submissions', 'failure_code')
