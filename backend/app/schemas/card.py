from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.card import CardStatus

class CardBase(BaseModel):
    number: str = Field(..., min_length=1, max_length=20, description="Número impresso no cartão, ex: 001")
    notes: Optional[str] = None

class CardCreate(CardBase):
    pass

class CardUpdate(BaseModel):
    status: Optional[CardStatus] = None
    notes: Optional[str] = None

class CardResponse(CardBase):
    id: int
    status: CardStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CardQueryResponse(BaseModel):
    card: CardResponse
    current_order_id: Optional[str] = None
    can_open_order: bool
    reason: Optional[str] = None
