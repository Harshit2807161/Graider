"""The migration history must stay a single line (no database needed)."""

from alembic.config import Config
from alembic.script import ScriptDirectory

from app.core.db import ALEMBIC_INI


def test_migrations_have_a_single_head():
    # Two branches that each add a migration on the same parent leave two heads after the merge,
    # and `alembic upgrade head` then refuses to run
    heads = ScriptDirectory.from_config(Config(str(ALEMBIC_INI))).get_heads()
    assert len(heads) == 1, f"multiple alembic heads: {heads}"
