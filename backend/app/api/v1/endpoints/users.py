from typing import Any, List

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlmodel import Session, select

from app import crud
from app.api import deps
from app.schemas.user import User, UserCreate, UserMe, UserUpdate
from app.models.user import Membership
from app.models.user import User as UserModel

router = APIRouter()

@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(deps.get_session),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve users.
    """
    users = crud.user.get_multi(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(deps.get_session),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new user.
    """
    user = crud.user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = crud.user.create(db, obj_in=user_in)
    return user

@router.get("/me", response_model=UserMe)
def read_user_me(
    db: Session = Depends(deps.get_session),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user with org_id from first membership.
    """
    membership = db.exec(
        select(Membership).where(Membership.user_id == current_user.id)
    ).first()
    org_id = membership.org_id if membership else None
    return UserMe(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_superuser=current_user.is_superuser,
        org_id=org_id,
    )
