from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cash_movement import CashMovement, MovementType
from app.models.cash_session import CashSession, CashSessionStatus
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.user import User
from app.schemas.cash import CashMovementCreate, CashMovementResponse, CashSessionResponse
from app.services.audit import log_audit

def compute_session_summary(db: Session, session: CashSession) -> CashSessionResponse:
    payments = db.query(Payment).filter(
        Payment.cash_session_id == session.id,
        Payment.status == PaymentStatus.COMPLETED
    ).all()

    total_cash = Decimal("0.00")
    total_pix = Decimal("0.00")
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for p in payments:
        amt = Decimal(str(p.amount))
        if p.method == PaymentMethod.CASH:
            total_cash += amt
        elif p.method == PaymentMethod.PIX:
            total_pix += amt
        elif p.method == PaymentMethod.DEBIT:
            total_debit += amt
        elif p.method == PaymentMethod.CREDIT:
            total_credit += amt

    total_electronic = total_pix + total_debit + total_credit

    supplies = Decimal("0.00")
    drains = Decimal("0.00")
    for m in session.movements:
        m_amt = Decimal(str(m.amount))
        if m.movement_type == MovementType.SUPPLY:
            supplies += m_amt
        elif m.movement_type == MovementType.DRAIN:
            drains += m_amt

    expected_cash = (Decimal(str(session.initial_cash)) + total_cash + supplies - drains).quantize(Decimal("0.01"))
    
    difference = None
    if session.final_cash_counted is not None:
        difference = (Decimal(str(session.final_cash_counted)) - expected_cash).quantize(Decimal("0.01"))
    elif session.expected_cash is not None and session.difference is not None:
        expected_cash = Decimal(str(session.expected_cash))
        difference = Decimal(str(session.difference))

    open_orders_count = db.query(Order).filter(Order.status == OrderStatus.OPEN).count()

    movement_responses = []
    for m in session.movements:
        movement_responses.append(
            CashMovementResponse(
                id=m.id,
                session_id=m.session_id,
                movement_type=m.movement_type,
                amount=Decimal(str(m.amount)),
                reason=m.reason,
                user_name=m.user.full_name if m.user else None,
                created_at=m.created_at
            )
        )

    return CashSessionResponse(
        id=session.id,
        opened_by_name=session.opened_by.full_name if session.opened_by else None,
        closed_by_name=session.closed_by.full_name if session.closed_by else None,
        initial_cash=Decimal(str(session.initial_cash)),
        final_cash_counted=Decimal(str(session.final_cash_counted)) if session.final_cash_counted is not None else None,
        expected_cash=expected_cash,
        difference=difference,
        status=session.status,
        opened_at=session.opened_at,
        closed_at=session.closed_at,
        notes=session.notes,
        movements=movement_responses,
        total_cash_payments=total_cash.quantize(Decimal("0.01")),
        total_pix_payments=total_pix.quantize(Decimal("0.01")),
        total_debit_payments=total_debit.quantize(Decimal("0.01")),
        total_credit_payments=total_credit.quantize(Decimal("0.01")),
        total_electronic_payments=total_electronic.quantize(Decimal("0.01")),
        open_orders_count=open_orders_count
    )

def get_active_cash_session(db: Session) -> Optional[CashSessionResponse]:
    session = db.query(CashSession).filter(CashSession.status == CashSessionStatus.OPEN).first()
    if not session:
        return None
    return compute_session_summary(db, session)

def open_cash_session(db: Session, initial_cash: Decimal, user: User, notes: Optional[str] = None) -> CashSessionResponse:
    existing = db.query(CashSession).filter(CashSession.status == CashSessionStatus.OPEN).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma sessão de caixa aberta (ID {existing.id}) por {existing.opened_by.full_name if existing.opened_by else 'outro operador'}."
        )

    session = CashSession(
        opened_by_id=user.id,
        initial_cash=initial_cash.quantize(Decimal("0.01")),
        status=CashSessionStatus.OPEN,
        opened_at=datetime.now(timezone.utc),
        notes=notes
    )
    db.add(session)
    db.flush()

    log_audit(
        db,
        action="CASH_OPEN",
        entity_type="CashSession",
        entity_id=str(session.id),
        user_id=user.id,
        username_snapshot=user.username,
        details={"initial_cash": float(initial_cash), "notes": notes}
    )

    db.commit()
    db.refresh(session)
    return compute_session_summary(db, session)

def create_cash_movement(db: Session, session_id: int, movement_in: CashMovementCreate, user: User) -> CashMovementResponse:
    session = db.query(CashSession).filter(CashSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de caixa não encontrada."
        )
    if session.status != CashSessionStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Movimentações só podem ser registradas em sessões de caixa abertas."
        )

    movement = CashMovement(
        session_id=session.id,
        movement_type=movement_in.movement_type,
        amount=movement_in.amount.quantize(Decimal("0.01")),
        reason=movement_in.reason,
        user_id=user.id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(movement)
    db.flush()

    log_audit(
        db,
        action=f"CASH_MOVEMENT_{movement_in.movement_type.value.upper()}",
        entity_type="CashMovement",
        entity_id=str(movement.id),
        user_id=user.id,
        username_snapshot=user.username,
        details={
            "session_id": session.id,
            "amount": float(movement.amount),
            "reason": movement.reason
        }
    )

    db.commit()
    db.refresh(movement)
    return CashMovementResponse(
        id=movement.id,
        session_id=movement.session_id,
        movement_type=movement.movement_type,
        amount=Decimal(str(movement.amount)),
        reason=movement.reason,
        user_name=user.full_name,
        created_at=movement.created_at
    )

def close_cash_session(db: Session, session_id: int, final_cash_counted: Decimal, user: User, notes: Optional[str] = None) -> CashSessionResponse:
    session = db.query(CashSession).filter(CashSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de caixa não encontrada."
        )
    if session.status != CashSessionStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sessão de caixa já foi encerrada."
        )

    summary = compute_session_summary(db, session)
    expected_cash = summary.expected_cash
    counted = final_cash_counted.quantize(Decimal("0.01"))
    diff = (counted - expected_cash).quantize(Decimal("0.01"))

    session.final_cash_counted = counted
    session.expected_cash = expected_cash
    session.difference = diff
    session.status = CashSessionStatus.CLOSED
    session.closed_by_id = user.id
    session.closed_at = datetime.now(timezone.utc)
    if notes:
        session.notes = (session.notes + " | " + notes) if session.notes else notes

    log_audit(
        db,
        action="CASH_CLOSE",
        entity_type="CashSession",
        entity_id=str(session.id),
        user_id=user.id,
        username_snapshot=user.username,
        details={
            "initial_cash": float(session.initial_cash),
            "final_cash_counted": float(counted),
            "expected_cash": float(expected_cash),
            "difference": float(diff),
            "notes": notes
        }
    )

    db.commit()
    db.refresh(session)
    return compute_session_summary(db, session)

def list_cash_sessions(db: Session, skip: int = 0, limit: int = 20) -> List[CashSessionResponse]:
    sessions = db.query(CashSession).order_by(CashSession.opened_at.desc()).offset(skip).limit(limit).all()
    return [compute_session_summary(db, s) for s in sessions]
