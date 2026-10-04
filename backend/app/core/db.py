from typing import Generator

from sqlmodel import create_engine, Session, SQLModel

from app.core.config import settings

# Use the same settings object as the rest of the app so DATABASE_URL from .env is honoured
# (os.getenv alone does not see values that only live in .env).
engine = create_engine(settings.DATABASE_URL, echo=settings.SQL_ECHO, pool_pre_ping=True)

def init_db():
    # Import models so their tables are registered on SQLModel.metadata
    import app.models  # noqa: F401

    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
