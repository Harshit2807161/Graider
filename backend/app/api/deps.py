from typing import Iterable, Optional
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.config import settings
from app.core import security
from app.core.constants import Role
from app.crud import user as crud_user
from app.models.user import Membership, User
from app.schemas.token import TokenPayload

# Define correct token URL based on new structure
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# Role groups used by endpoint permission checks
STAFF_ROLES = (Role.OWNER, Role.ADMIN, Role.TEACHER)
ADMIN_ROLES = (Role.OWNER, Role.ADMIN)


def get_current_user(
    db: Session = Depends(get_session),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.decode_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except jwt.PyJWTError:
        raise credentials_exception

    try:
        user = crud_user.get(db, id=UUID(token_data.sub))
    except ValueError:
        raise credentials_exception
    if user is None:
        raise credentials_exception
    return user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def get_membership(db: Session, *, user: User, org_id: UUID) -> Optional[Membership]:
    """Return the user's membership in an org, or None."""
    return db.exec(
        select(Membership)
        .where(Membership.user_id == user.id)
        .where(Membership.org_id == org_id)
        .where(Membership.deleted_at == None)  # noqa: E711
    ).first()


def require_org_role(
    db: Session,
    *,
    user: User,
    org_id: UUID,
    roles: Optional[Iterable[Role]] = None,
) -> Optional[Membership]:
    """
    Ensure the user belongs to the org (optionally with one of `roles`).

    Superusers pass every check; they get their membership back if they have one,
    otherwise None.
    """
    membership = get_membership(db, user=user, org_id=org_id)
    if user.is_superuser:
        return membership
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    if roles is not None and membership.role not in tuple(roles):
        raise HTTPException(status_code=403, detail="Not enough permissions in this organization")
    return membership
