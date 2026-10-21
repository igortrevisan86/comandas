from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.cash import (
    CashMovementCreate,
    CashMovementResponse,
    CashSessionCloseRequest,
    CashSessionOpenRequest,
    CashSessionResponse,
)
from app.services import cash_service

router = APIRouter(prefix="/cash", tags=["Frente de Caixa"])

@router.get("/active", response_model=Optional[CashSessionResponse])
@router.get("/session/current", response_model=Optional[CashSessionResponse])
def get_current_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna os dados da sessão de caixa atualmente aberta, com somatórios e movimentações.
    """
    return cash_service.get_active_cash_session(db)

@router.post("/open", response_model=CashSessionResponse, status_code=status.HTTP_200_OK)
@router.post("/session/open", response_model=CashSessionResponse, status_code=status.HTTP_200_OK)
def open_session(
    open_in: CashSessionOpenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return cash_service.open_cash_session(
        db=db,
        initial_cash=open_in.initial_cash,
        user=current_user,
        notes=open_in.notes
    )

@router.post("/{session_id}/close", response_model=CashSessionResponse, status_code=status.HTTP_200_OK)
@router.post("/session/{session_id}/close", response_model=CashSessionResponse, status_code=status.HTTP_200_OK)
def close_session(
    session_id: int,
    close_in: CashSessionCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return cash_service.close_cash_session(
        db=db,
        session_id=session_id,
        final_cash_counted=close_in.final_cash_counted,
        user=current_user,
        notes=close_in.notes
    )

@router.post("/{session_id}/movement", response_model=CashMovementResponse, status_code=status.HTTP_200_OK)
@router.post("/session/{session_id}/movements", response_model=CashMovementResponse, status_code=status.HTTP_200_OK)
def create_movement(
    session_id: int,
    movement_in: CashMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return cash_service.create_cash_movement(
        db=db,
        session_id=session_id,
        movement_in=movement_in,
        user=current_user
    )

@router.get("/sessions", response_model=List[CashSessionResponse])
def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return cash_service.list_cash_sessions(db, skip=skip, limit=limit)
