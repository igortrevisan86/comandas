from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.card import Card, CardStatus
from app.models.cash_session import CashSession, CashSessionStatus
from app.models.order import Order, OrderStatus
from app.models.order_split import OrderSplit, SplitStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.user import User
from app.schemas.payment import PaymentCreate
from app.services.audit import log_audit
from app.services.order_service import recalculate_order_totals

def process_payment(
    db: Session,
    payment_in: PaymentCreate,
    user: User,
    auto_close_if_paid: bool = False
) -> Payment:
    order = db.query(Order).filter(Order.id == payment_in.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comanda não encontrada."
        )
    if order.status != OrderStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível realizar pagamentos em uma comanda encerrada ou cancelada."
        )

    recalculate_order_totals(db, order)
    
    pay_amount = Decimal(str(payment_in.amount)).quantize(Decimal("0.01"))
    if pay_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor de pagamento deve ser superior a zero."
        )
    if pay_amount > order.balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Valor informado (R$ {pay_amount}) excede o saldo restante (R$ {order.balance})."
        )

    # Cash change validation
    amount_received = None
    change_amount = Decimal("0.00")
    if payment_in.method == PaymentMethod.CASH:
        if payment_in.amount_received is not None:
            amount_received = Decimal(str(payment_in.amount_received)).quantize(Decimal("0.01"))
            if amount_received < pay_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Valor em dinheiro recebido (R$ {amount_received}) é menor que o valor a ser pago (R$ {pay_amount})."
                )
            change_amount = (amount_received - pay_amount).quantize(Decimal("0.01"))
        else:
            amount_received = pay_amount

    # Cash session association
    active_session = db.query(CashSession).filter(CashSession.status == CashSessionStatus.OPEN).first()
    session_id = active_session.id if active_session else None

    # Handle split association
    split = None
    if payment_in.split_id:
        split = db.query(OrderSplit).filter(
            OrderSplit.id == payment_in.split_id,
            OrderSplit.order_id == order.id
        ).first()
        if not split:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Divisão ID {payment_in.split_id} não encontrada para esta comanda."
            )
        split.paid_amount = (split.paid_amount + pay_amount).quantize(Decimal("0.01"))
        if split.paid_amount >= split.target_amount:
            split.status = SplitStatus.PAID
        else:
            split.status = SplitStatus.PARTIAL

    payment = Payment(
        order_id=order.id,
        split_id=split.id if split else None,
        cash_session_id=session_id,
        user_id=user.id,
        method=payment_in.method,
        amount=pay_amount,
        amount_received=amount_received,
        change_amount=change_amount,
        status=PaymentStatus.COMPLETED,
        notes=payment_in.notes,
        reference_code=payment_in.reference_code,
        created_at=datetime.now(timezone.utc)
    )
    db.add(payment)
    db.flush()

    recalculate_order_totals(db, order)

    # If completely paid and auto_close is enabled, finalize order
    if auto_close_if_paid and order.balance <= Decimal("0.00"):
        order.status = OrderStatus.CLOSED
        order.closed_by_id = user.id
        order.closed_at = datetime.now(timezone.utc)
        
        card = db.query(Card).filter(Card.id == order.card_id).first()
        if card and card.status != CardStatus.BLOCKED:
            card.status = CardStatus.AVAILABLE

    log_audit(
        db,
        action="PAYMENT_ADD",
        entity_type="Payment",
        entity_id=str(payment.id),
        user_id=user.id,
        username_snapshot=user.username,
        details={
            "order_id": order.id,
            "method": payment.method.value,
            "amount": float(pay_amount),
            "amount_received": float(amount_received) if amount_received else None,
            "change_amount": float(change_amount),
            "order_balance_remaining": float(order.balance)
        }
    )

    db.commit()
    db.refresh(payment)
    return payment

def cancel_payment(
    db: Session,
    payment_id: int,
    reason: str,
    user: User
) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado."
        )
    if payment.status == PaymentStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pagamento já se encontra estornado/cancelado."
        )

    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comanda vinculada ao pagamento não encontrada."
        )

    payment.status = PaymentStatus.CANCELLED
    payment.cancellation_reason = reason
    payment.cancelled_by_id = user.id
    payment.cancelled_at = datetime.now(timezone.utc)

    # Revert split amount if applicable
    if payment.split_id:
        split = db.query(OrderSplit).filter(OrderSplit.id == payment.split_id).first()
        if split:
            split.paid_amount = max(Decimal("0.00"), split.paid_amount - payment.amount)
            if split.paid_amount == Decimal("0.00"):
                split.status = SplitStatus.PENDING
            elif split.paid_amount < split.target_amount:
                split.status = SplitStatus.PARTIAL

    # If the order was closed, re-open it because the payment is reverted
    if order.status == OrderStatus.CLOSED:
        order.status = OrderStatus.OPEN
        order.closed_by_id = None
        order.closed_at = None
        
        card = db.query(Card).filter(Card.id == order.card_id).first()
        if card:
            card.status = CardStatus.IN_USE

    recalculate_order_totals(db, order)

    log_audit(
        db,
        action="PAYMENT_CANCEL",
        entity_type="Payment",
        entity_id=str(payment.id),
        user_id=user.id,
        username_snapshot=user.username,
        details={
            "order_id": order.id,
            "reverted_amount": float(payment.amount),
            "reason": reason
        }
    )

    db.commit()
    db.refresh(payment)
    return payment
