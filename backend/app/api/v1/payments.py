from decimal import Decimal
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.payment import PaymentCancelRequest, PaymentCreate, PaymentResponse
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["Pagamentos"])

def format_payment(p) -> PaymentResponse:
    return PaymentResponse(
        id=p.id,
        order_id=p.order_id,
        split_id=p.split_id,
        cash_session_id=p.cash_session_id,
        user_id=p.user_id,
        user_name=p.user.full_name if p.user else None,
        method=p.method,
        amount=Decimal(str(p.amount)),
        amount_received=Decimal(str(p.amount_received)) if p.amount_received is not None else None,
        change_amount=Decimal(str(p.change_amount)),
        status=p.status,
        cancellation_reason=p.cancellation_reason,
        cancelled_at=p.cancelled_at,
        notes=p.notes,
        reference_code=p.reference_code,
        created_at=p.created_at
    )

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_200_OK)
def create_payment(
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = payment_service.process_payment(
        db=db,
        payment_in=payment_in,
        user=current_user,
        auto_close_if_paid=False
    )
    return format_payment(payment)

@router.post("/{payment_id}/cancel", response_model=PaymentResponse, status_code=status.HTTP_200_OK)
def cancel_payment(
    payment_id: int,
    cancel_in: PaymentCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = payment_service.cancel_payment(
        db=db,
        payment_id=payment_id,
        reason=cancel_in.reason,
        user=current_user
    )
    return format_payment(payment)
