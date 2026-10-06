"""Migration tests: run only against Postgres (set MIGRATIONS_DATABASE_URL to an empty, dedicated DB)."""

import os

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text
from sqlmodel import SQLModel

from app.core.db import ALEMBIC_INI

MIGRATIONS_DATABASE_URL = os.environ.get("MIGRATIONS_DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not MIGRATIONS_DATABASE_URL.startswith("postgresql"),
    reason="set MIGRATIONS_DATABASE_URL to a dedicated Postgres database",
)


@pytest.fixture(autouse=True)
def fresh_db():
    """Override the shared fixture: this module manages its own database through Alembic."""
    yield


@pytest.fixture
def alembic_config() -> Config:
    config = Config(str(ALEMBIC_INI))
    config.attributes["database_url"] = MIGRATIONS_DATABASE_URL
    config.attributes["configure_logger"] = False
    return config


@pytest.fixture
def engine():
    eng = create_engine(MIGRATIONS_DATABASE_URL)
    yield eng
    eng.dispose()


def enum_types(engine) -> set[str]:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT typname FROM pg_type WHERE typtype = 'e'"))
        return {r[0] for r in rows}


def test_upgrade_matches_models_and_downgrade_is_clean(alembic_config, engine):
    command.downgrade(alembic_config, "base")
    command.upgrade(alembic_config, "head")

    # The migrations must produce exactly what the SQLModel models describe
    with engine.connect() as conn:
        context = MigrationContext.configure(conn, opts={"compare_type": True})
        assert compare_metadata(context, SQLModel.metadata) == []

    command.downgrade(alembic_config, "base")
    assert set(inspect(engine).get_table_names()) <= {"alembic_version"}
    assert enum_types(engine) == set()

    # And it can be applied again from scratch
    command.upgrade(alembic_config, "head")
    assert "submissions" in inspect(engine).get_table_names()


def test_llm_calls_are_append_only(alembic_config, engine):
    command.downgrade(alembic_config, "base")
    command.upgrade(alembic_config, "head")
    insert = text(
        "INSERT INTO llm_calls (id, role, purpose, attempt_no, attempt_kind, provider, model_requested, "
        "external, request, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, "
        "reasoning_tokens, latency_ms, schema_name, schema_hash, degraded, created_at) VALUES "
        "(gen_random_uuid(), 'grader', 'grade', 1, 'initial', 'anthropic', 'claude-sonnet-5-5', true, "
        "'{}', 0, 0, 0, 0, 0, 0, 'GradeOutput', 'h', false, now())"
    )
    with engine.begin() as conn:
        conn.execute(insert)

    for statement in ("UPDATE llm_calls SET cost_usd = 0", "DELETE FROM llm_calls", "TRUNCATE llm_calls"):
        with pytest.raises(Exception, match="append-only"):
            with engine.begin() as conn:
                conn.execute(text(statement))

    with engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM llm_calls")).scalar() == 1

