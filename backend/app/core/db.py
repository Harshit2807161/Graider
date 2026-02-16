from sqlmodel import create_engine, Session, SQLModel
from typing import Generator
import os

# Updated to port 5433 to avoid conflict with local postgres
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/graider")

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
