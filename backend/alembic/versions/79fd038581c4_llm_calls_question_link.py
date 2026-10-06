"""llm_calls question link

Model calls can now belong to a question (rubric parsing happens outside grading runs).
Every call must belong to a grading run, a question, or both.

Revision ID: 79fd038581c4
Revises: cb97da156f1e
Create Date: 2026-10-06 02:37:22.299444

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401  (autogenerate emits sqlmodel types)


# revision identifiers, used by Alembic.
revision: str = '79fd038581c4'
down_revision: Union[str, Sequence[str], None] = 'cb97da156f1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_NAME = "fk_llm_calls_question_id_questions"
CHECK_NAME = "ck_llm_calls_run_or_question"


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("llm_calls") as batch:
        batch.add_column(sa.Column("question_id", sa.Uuid(), nullable=True))
        batch.create_index(batch.f("ix_llm_calls_question_id"), ["question_id"], unique=False)
        batch.create_foreign_key(FK_NAME, "questions", ["question_id"], ["id"])
        batch.create_check_constraint(CHECK_NAME, "run_id IS NOT NULL OR question_id IS NOT NULL")


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("llm_calls") as batch:
        batch.drop_constraint(CHECK_NAME, type_="check")
        batch.drop_constraint(FK_NAME, type_="foreignkey")
        batch.drop_index(batch.f("ix_llm_calls_question_id"))
        batch.drop_column("question_id")
