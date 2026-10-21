from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
from app.services.audit_service import record_audit

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_user(db: Session, user_in: UserCreate, current_user: Optional[User] = None, ip: Optional[str] = None) -> User:
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nome de usuário '{user_in.username}' já está em uso."
        )
    user = User(
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit(
        db, current_user, "USER_CREATE", "User", str(user.id),
        {"username": user.username, "role": user.role.value}, ip
    )
    db.commit()
    return user

def update_user(db: Session, user_id: int, user_in: UserUpdate, current_user: User, ip: Optional[str] = None) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    
    changes = {}
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
        changes["full_name"] = user_in.full_name
    if user_in.role is not None:
        user.role = user_in.role
        changes["role"] = user_in.role.value
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
        changes["is_active"] = user_in.is_active
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)
        changes["password_changed"] = True

    db.commit()
    db.refresh(user)
    record_audit(db, current_user, "USER_UPDATE", "User", str(user.id), changes, ip)
    db.commit()
    return user
