from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.cash_session import CashSessionStatus
from app.models.cash_movement import MovementType

class CashSessionOpenRequest(BaseModel):
    initial_cash: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=10, decimal_places=2, description="Fundo de troco inicial")
    notes: Optional[str] = None

class CashMovementCreate(BaseModel):
    movement_type: MovementType
    amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    reason: str = Field(..., min_length=3, max_length=255, description="Justificativa da sangria ou suprimento")

class CashSessionCloseRequest(BaseModel):
    final_cash_counted: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2, description="Total de dinheiro físico apurado na gaveta")
    notes: Optional[str] = None

class CashMovementResponse(BaseModel):
    id: int
    session_id: int
    movement_type: MovementType
    amount: Decimal
    reason: str
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CashSessionResponse(BaseModel):
    id: int
    opened_by_name: Optional[str] = None
    closed_by_name: Optional[str] = None
    initial_cash: Decimal
    final_cash_counted: Optional[Decimal] = None
    expected_cash: Optional[Decimal] = None
    difference: Optional[Decimal] = None
    status: CashSessionStatus
    opened_at: datetime
    closed_at: Optional[datetime] = None
    notes: Optional[str] = None
    movements: List[CashMovementResponse] = []
    
    # Detalhes computados de recebimentos durante a sessão
    total_cash_payments: Decimal = Decimal("0.00")
    total_pix_payments: Decimal = Decimal("0.00")
    total_debit_payments: Decimal = Decimal("0.00")
    total_credit_payments: Decimal = Decimal("0.00")
    total_electronic_payments: Decimal = Decimal("0.00")
    open_orders_count: int = 0

    class Config:
        from_attributes = True
