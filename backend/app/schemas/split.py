from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.order_split import SplitType, SplitStatus

class EqualSplitRequest(BaseModel):
    num_participants: int = Field(..., ge=2, le=50, description="Número de pessoas para divisão igualitária")

class SplitItemAllocation(BaseModel):
    order_item_id: int
    quantity_fraction: Decimal = Field(default=Decimal("1.000"), gt=0, le=1.000)

class ParticipantItemSplitInput(BaseModel):
    participant_name: str = Field(..., min_length=1, max_length=100)
    items: List[SplitItemAllocation] = Field(..., min_length=1)

class ItemSplitRequest(BaseModel):
    participants: List[ParticipantItemSplitInput] = Field(..., min_length=1)

class OrderSplitItemResponse(BaseModel):
    id: int
    order_item_id: int
    product_name: Optional[str] = None
    quantity_fraction: Decimal
    assigned_amount: Decimal

    class Config:
        from_attributes = True

class SplitResponse(BaseModel):
    id: int
    order_id: str
    participant_name: str
    split_type: SplitType
    target_amount: Decimal
    paid_amount: Decimal
    status: SplitStatus
    created_at: datetime
    assigned_items: List[OrderSplitItemResponse] = []

    class Config:
        from_attributes = True
