import logging
from sqlmodel import Session

from app import crud, models
from app.core.db import engine, init_db
from app.schemas.user import UserCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init() -> None:
    init_db()
    with Session(engine) as session:
        user = crud.user.get_by_email(session, email="agarwalparth0903@gmail.com")
        if not user:
            user_in = UserCreate(
                email="agarwalparth0903@gmail.com",
                password="admin",
                full_name="Parth Agarwal",
                is_superuser=True,
            )
            user = crud.user.create(session, obj_in=user_in)
            logger.info(f"Superuser agarwalparth0903@gmail.com created")
        else:
            logger.info("Superuser already exists")

if __name__ == "__main__":
    init()
