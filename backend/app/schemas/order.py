from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.order import OrderStatus
from app.models.order_item import OrderItemStatus

class OrderOpenRequest(BaseModel):
    card_number: str = Field(..., min_length=1, max_length=20)
    notes: Optional[str] = None

class CartItemInput(BaseModel):
    product_id: int
    quantity: Decimal = Field(default=Decimal("1.000"), gt=0, max_digits=10, decimal_places=3)

class OrderAddItemsRequest(BaseModel):
    items: List[CartItemInput] = Field(..., min_length=1)
    idempotency_key: Optional[str] = None

class OrderItemCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=255, description="Motivo obrigatório para o cancelamento/estorno")

class OrderItemResponse(BaseModel):
    id: int
    order_id: str
    product_id: Optional[int]
    product_name_snapshot: str
    unit_price_snapshot: Decimal
    quantity: Decimal
    subtotal: Decimal
    status: OrderItemStatus
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: str
    card_id: int
    card_number_snapshot: str
    status: OrderStatus
    opened_by_name: Optional[str] = None
    closed_by_name: Optional[str] = None
    opened_at: datetime
    closed_at: Optional[datetime] = None
    total_amount: Decimal
    total_paid: Decimal
    balance: Decimal
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class OrderSummaryResponse(OrderResponse):
    items: List[OrderItemResponse] = []
    payments: List["PaymentResponse"] = []
    splits: List["SplitResponse"] = []

from app.schemas.payment import PaymentResponse
from app.schemas.split import SplitResponse
OrderSummaryResponse.model_rebuild()
