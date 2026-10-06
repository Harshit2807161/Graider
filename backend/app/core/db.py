from pathlib import Path
from typing import Generator

from sqlmodel import create_engine, Session

from app.core.config import settings

# Use the same settings object as the rest of the app so DATABASE_URL from .env is honoured
# (os.getenv alone does not see values that only live in .env).
engine = create_engine(settings.DATABASE_URL, echo=settings.SQL_ECHO, pool_pre_ping=True)

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"


def upgrade_to_head() -> None:
    """Apply all pending Alembic migrations. The schema is never created with create_all."""
    from alembic import command
    from alembic.config import Config

    config = Config(str(ALEMBIC_INI))
    config.attributes["configure_logger"] = False
    command.upgrade(config, "head")


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
