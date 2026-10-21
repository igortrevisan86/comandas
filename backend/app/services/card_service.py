from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.card import Card, CardStatus
from app.models.order import Order, OrderStatus
from app.schemas.card import CardQueryResponse, CardResponse, CardCreate, CardUpdate

def normalize_card_number(raw_number: str) -> str:
    cleaned = raw_number.strip().lstrip("0")
    if not cleaned:
        cleaned = "0"
    # Format with 3 digits standard if numeric
    if cleaned.isdigit() and len(cleaned) <= 3:
        return cleaned.zfill(3)
    return raw_number.strip()

def get_or_create_card(db: Session, raw_number: str) -> Card:
    number = normalize_card_number(raw_number)
    card = db.query(Card).filter(Card.number == number).first()
    if not card:
        card = Card(number=number, status=CardStatus.AVAILABLE)
        db.add(card)
        db.commit()
        db.refresh(card)
    return card

def query_card(db: Session, raw_number: str) -> CardQueryResponse:
    number = normalize_card_number(raw_number)
    card = db.query(Card).filter(Card.number == number).first()
    
    # Auto-register if not yet existing for seamless initial experience
    if not card:
        card = Card(number=number, status=CardStatus.AVAILABLE)
        db.add(card)
        db.commit()
        db.refresh(card)

    active_order = db.query(Order).filter(
        Order.card_id == card.id,
        Order.status == OrderStatus.OPEN
    ).order_by(Order.opened_at.desc()).first()

    current_order_id = active_order.id if active_order else None
    
    can_open = False
    reason = None
    if card.status == CardStatus.BLOCKED:
        can_open = False
        reason = "Cartão bloqueado para uso."
    elif card.status == CardStatus.IN_USE:
        can_open = False
        reason = f"Cartão já está em uso na comanda aberta #{current_order_id}."
    else:
        can_open = True

    return CardQueryResponse(
        card=CardResponse.model_validate(card),
        current_order_id=current_order_id,
        can_open_order=can_open,
        reason=reason
    )

def list_cards(db: Session, skip: int = 0, limit: int = 100) -> List[Card]:
    return db.query(Card).order_by(Card.number.asc()).offset(skip).limit(limit).all()

def create_card(db: Session, card_in: CardCreate) -> Card:
    number = normalize_card_number(card_in.number)
    existing = db.query(Card).filter(Card.number == number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cartão com número '{number}' já existe."
        )
    card = Card(number=number, notes=card_in.notes, status=CardStatus.AVAILABLE)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card

def batch_create_cards(db: Session, start_num: int, end_num: int) -> int:
    created_count = 0
    for num in range(start_num, end_num + 1):
        num_str = str(num).zfill(3)
        if not db.query(Card).filter(Card.number == num_str).first():
            card = Card(number=num_str, status=CardStatus.AVAILABLE)
            db.add(card)
            created_count += 1
    if created_count > 0:
        db.commit()
    return created_count

def update_card(db: Session, card_id: int, card_in: CardUpdate) -> Card:
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão não encontrado."
        )
    if card_in.status is not None:
        # Cannot set to AVAILABLE if there is an active OPEN order
        if card_in.status == CardStatus.AVAILABLE:
            active_order = db.query(Order).filter(
                Order.card_id == card.id,
                Order.status == OrderStatus.OPEN
            ).first()
            if active_order:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Não é possível liberar o cartão pois a comanda #{active_order.id} ainda está aberta."
                )
        card.status = card_in.status
    if card_in.notes is not None:
        card.notes = card_in.notes
    db.commit()
    db.refresh(card)
    return card
