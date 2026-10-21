from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.models.payment import PaymentMethod, PaymentStatus

class PaymentCreate(BaseModel):
    order_id: str
    split_id: Optional[int] = None
    method: PaymentMethod
    amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2, description="Valor a abater da conta")
    amount_received: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=2, description="Valor entregue em dinheiro (para cálculo de troco)")
    notes: Optional[str] = None
    reference_code: Optional[str] = None

class PaymentCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=255, description="Justificativa do estorno do pagamento")

class PaymentResponse(BaseModel):
    id: int
    order_id: str
    split_id: Optional[int] = None
    cash_session_id: Optional[int] = None
    user_id: int
    user_name: Optional[str] = None
    method: PaymentMethod
    amount: Decimal
    amount_received: Optional[Decimal] = None
    change_amount: Decimal
    status: PaymentStatus
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    notes: Optional[str] = None
    reference_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
