"""Migrate the database to the latest schema and create the first superuser.

Run with: python -m app.initial_data
Credentials come from FIRST_SUPERUSER_EMAIL / FIRST_SUPERUSER_PASSWORD (env or .env).
"""

import logging
import sys

from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.core.db import engine, upgrade_to_head
from app.schemas.user import UserCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init() -> None:
    upgrade_to_head()

    email = settings.FIRST_SUPERUSER_EMAIL
    password = settings.FIRST_SUPERUSER_PASSWORD
    if not email or not password:
        logger.error("Set FIRST_SUPERUSER_EMAIL and FIRST_SUPERUSER_PASSWORD to create the first superuser")
        sys.exit(1)
    if len(password) < 8:
        logger.error("FIRST_SUPERUSER_PASSWORD must be at least 8 characters")
        sys.exit(1)

    with Session(engine) as session:
        user = crud.user.get_by_email(session, email=email)
        if not user:
            user_in = UserCreate(
                email=email,
                password=password,
                full_name="Admin",
                is_superuser=True,
            )
            crud.user.create(session, obj_in=user_in)
            logger.info("Superuser %s created", email)
        else:
            logger.info("Superuser already exists")

if __name__ == "__main__":
    init()
