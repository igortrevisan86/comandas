from typing import List
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_admin, get_current_user, get_db
from app.models.user import User
from app.schemas.card import CardCreate, CardQueryResponse, CardResponse, CardUpdate
from app.services import card_service

router = APIRouter(prefix="/cards", tags=["Cartões de Comanda"])

class BatchCreateCardsRequest(BaseModel):
    start_num: int = Field(default=1, ge=1, le=9999)
    end_num: int = Field(default=50, ge=1, le=9999)

@router.get("/query/{card_number}", response_model=CardQueryResponse)
@router.get("/{card_number}/status", response_model=CardQueryResponse)
def query_card_by_number(
    card_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Consulta o estado de um cartão pelo número (suporta leitor de código de barras ou digitação).
    """
    return card_service.query_card(db, card_number)

@router.get("", response_model=List[CardResponse])
def list_cards(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return card_service.list_cards(db, skip=skip, limit=limit)

@router.post("", response_model=CardResponse, status_code=status.HTTP_200_OK)
def create_card(
    card_in: CardCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    return card_service.create_card(db, card_in)

@router.post("/batch", status_code=status.HTTP_200_OK)
def batch_create_cards(
    batch_req: BatchCreateCardsRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    created = card_service.batch_create_cards(db, batch_req.start_num, batch_req.end_num)
    return {"message": f"{created} cartões gerados com sucesso.", "created_count": created}

@router.put("/{card_id}", response_model=CardResponse)
def update_card(
    card_id: int,
    card_in: CardUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    return card_service.update_card(db, card_id, card_in)
