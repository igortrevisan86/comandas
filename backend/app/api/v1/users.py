from typing import List, Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_admin, get_client_ip
from app.models.user import User
from app.schemas.auth import UserCreate, UserUpdate, UserResponse
from app.services.auth_service import create_user, update_user

router = APIRouter()

@router.get("", response_model=List[UserResponse])
def list_system_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [UserResponse.model_validate(u) for u in users]

@router.post("", response_model=UserResponse)
def register_system_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    ip = get_client_ip(request)
    new_user = create_user(db, user_in, current_user=admin, ip=ip)
    return UserResponse.model_validate(new_user)

@router.put("/{user_id}", response_model=UserResponse)
def update_system_user(
    user_id: int,
    user_in: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    ip = get_client_ip(request)
    updated = update_user(db, user_id, user_in, current_user=admin, ip=ip)
    return UserResponse.model_validate(updated)
