from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.cash_session import CashSession, CashSessionStatus
from app.models.cash_movement import CashMovement, MovementType
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.cash import CashSessionOpenRequest, CashMovementCreate, CashSessionCloseRequest, CashSessionResponse, CashMovementResponse
from app.services.audit_service import record_audit

def get_active_session(db: Session) -> Optional[CashSession]:
    return db.query(CashSession).filter(CashSession.status == CashSessionStatus.OPEN).first()

def open_session(
    db: Session,
    request: CashSessionOpenRequest,
    current_user: User,
    ip: Optional[str] = None
) -> CashSession:
    active = get_active_session(db)
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma sessão de caixa aberta (Sessão #{active.id}, aberta em {active.opened_at.strftime('%d/%m/%Y %H:%M')})."
        )

    initial_cash = Decimal(str(request.initial_cash))
    session = CashSession(
        opened_by_id=current_user.id,
        initial_cash=initial_cash,
        status=CashSessionStatus.OPEN,
        opened_at=datetime.now(timezone.utc),
        notes=request.notes
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    record_audit(
        db, current_user, "CASH_SESSION_OPEN", "CashSession", str(session.id),
        {"initial_cash": str(initial_cash), "notes": request.notes}, ip
    )
    db.commit()
    return session

def add_movement(
    db: Session,
    session_id: int,
    mov_in: CashMovementCreate,
    current_user: User,
    ip: Optional[str] = None
) -> CashMovement:
    session = db.query(CashSession).filter(CashSession.id == session_id).with_for_update().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sessão de caixa não encontrada.")
    if session.status != CashSessionStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível realizar movimentações em um caixa fechado.")

    amount = Decimal(str(mov_in.amount))
    movement = CashMovement(
        session_id=session.id,
        movement_type=mov_in.movement_type,
        amount=amount,
        reason=mov_in.reason.strip(),
        user_id=current_user.id
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    record_audit(
        db, current_user, f"CASH_MOVEMENT_{mov_in.movement_type.value.upper()}", "CashMovement", str(movement.id),
        {"amount": str(amount), "reason": mov_in.reason, "session_id": session.id}, ip
    )
    db.commit()
    return movement

def close_session(
    db: Session,
    session_id: int,
    request: CashSessionCloseRequest,
    current_user: User,
    ip: Optional[str] = None
) -> CashSession:
    session = db.query(CashSession).filter(CashSession.id == session_id).with_for_update().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sessão de caixa não encontrada.")
    if session.status != CashSessionStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta sessão de caixa já está fechada.")

    # Calcular dinheiro esperado:
    # Saldo Inicial + Pagamentos em Dinheiro + Suprimentos - Sangrias
    cash_payments = db.query(Payment).filter(
        Payment.cash_session_id == session.id,
        Payment.method == PaymentMethod.CASH,
        Payment.status == PaymentStatus.COMPLETED
    ).all()
    total_cash_in = sum((p.amount for p in cash_payments), Decimal("0.00"))

    supplies = db.query(CashMovement).filter(
        CashMovement.session_id == session.id,
        CashMovement.movement_type == MovementType.SUPPLY
    ).all()
    total_supplies = sum((m.amount for m in supplies), Decimal("0.00"))

    drains = db.query(CashMovement).filter(
        CashMovement.session_id == session.id,
        CashMovement.movement_type == MovementType.DRAIN
    ).all()
    total_drains = sum((m.amount for m in drains), Decimal("0.00"))

    expected_cash = session.initial_cash + total_cash_in + total_supplies - total_drains
    final_counted = Decimal(str(request.final_cash_counted))
    difference = final_counted - expected_cash

    session.closed_by_id = current_user.id
    session.closed_at = datetime.now(timezone.utc)
    session.expected_cash = expected_cash
    session.final_cash_counted = final_counted
    session.difference = difference
    session.status = CashSessionStatus.CLOSED
    if request.notes:
        session.notes = (session.notes or "") + "\n" + request.notes

    db.commit()
    db.refresh(session)

    record_audit(
        db, current_user, "CASH_SESSION_CLOSE", "CashSession", str(session.id),
        {
            "expected_cash": str(expected_cash),
            "final_cash_counted": str(final_counted),
            "difference": str(difference),
            "cash_payments": str(total_cash_in),
            "supplies": str(total_supplies),
            "drains": str(total_drains)
        },
        ip
    )
    db.commit()
    return session

def get_session_details(db: Session, session: CashSession) -> CashSessionResponse:
    # Pagamentos por método nesta sessão
    payments = db.query(Payment).filter(
        Payment.cash_session_id == session.id,
        Payment.status == PaymentStatus.COMPLETED
    ).all()

    total_cash = sum((p.amount for p in payments if p.method == PaymentMethod.CASH), Decimal("0.00"))
    total_pix = sum((p.amount for p in payments if p.method == PaymentMethod.PIX), Decimal("0.00"))
    total_debit = sum((p.amount for p in payments if p.method == PaymentMethod.DEBIT), Decimal("0.00"))
    total_credit = sum((p.amount for p in payments if p.method == PaymentMethod.CREDIT), Decimal("0.00"))
    total_electronic = total_pix + total_debit + total_credit

    # Calcular dinheiro esperado atual se a sessão ainda estiver aberta
    expected = session.expected_cash
    if session.status == CashSessionStatus.OPEN:
        supplies = sum((m.amount for m in session.movements if m.movement_type == MovementType.SUPPLY), Decimal("0.00"))
        drains = sum((m.amount for m in session.movements if m.movement_type == MovementType.DRAIN), Decimal("0.00"))
        expected = session.initial_cash + total_cash + supplies - drains

    # Verificar comandas abertas
    open_orders_cnt = db.query(Order).filter(Order.status == OrderStatus.OPEN).count()

    movements_resp = [
        CashMovementResponse(
            id=m.id,
            session_id=m.session_id,
            movement_type=m.movement_type,
            amount=m.amount,
            reason=m.reason,
            user_name=m.user.full_name if m.user else None,
            created_at=m.created_at
        ) for m in session.movements
    ]

    return CashSessionResponse(
        id=session.id,
        opened_by_name=session.opened_by.full_name if session.opened_by else None,
        closed_by_name=session.closed_by.full_name if session.closed_by else None,
        initial_cash=session.initial_cash,
        final_cash_counted=session.final_cash_counted,
        expected_cash=expected,
        difference=session.difference,
        status=session.status,
        opened_at=session.opened_at,
        closed_at=session.closed_at,
        notes=session.notes,
        movements=movements_resp,
        total_cash_payments=total_cash,
        total_pix_payments=total_pix,
        total_debit_payments=total_debit,
        total_credit_payments=total_credit,
        total_electronic_payments=total_electronic,
        open_orders_count=open_orders_cnt
    )
