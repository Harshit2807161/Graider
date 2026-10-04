from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union

import bcrypt
import jwt

from app.core.config import settings

# bcrypt only looks at the first 72 bytes of a password; newer bcrypt releases
# raise instead of silently truncating, so truncate explicitly.
_BCRYPT_MAX_BYTES = 72


def _encode_password(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta

    to_encode = {"exp": expire, "sub": str(subject)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT. Raises jwt.PyJWTError on any failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    # Accounts created from a roster import have no password until one is set.
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(_encode_password(plain_password), hashed_password.encode("utf-8"))
    except ValueError:
        # Malformed hash stored in the DB
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_encode_password(password), bcrypt.gensalt()).decode("utf-8")
