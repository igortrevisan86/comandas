from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.card import Card, CardStatus
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem, OrderItemStatus
from app.models.payment import Payment, PaymentStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderOpenRequest, CartItemInput
from app.services.audit_service import record_audit

def recalculate_order_totals(db: Session, order: Order) -> None:
    db.flush()
    active_items = db.query(OrderItem).filter(
        OrderItem.order_id == order.id,
        OrderItem.status == OrderItemStatus.ACTIVE
    ).all()
    
    total = sum((Decimal(str(item.subtotal)) for item in active_items), Decimal("0.00"))
    
    completed_payments = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.status == PaymentStatus.COMPLETED
    ).all()
    total_paid = sum((Decimal(str(p.amount)) for p in completed_payments), Decimal("0.00"))
    
    order.total_amount = total.quantize(Decimal("0.01"))
    order.total_paid = total_paid.quantize(Decimal("0.01"))
    order.balance = max(Decimal("0.00"), order.total_amount - order.total_paid).quantize(Decimal("0.01"))
    db.flush()

def open_order(
    db: Session,
    card_number: Optional[str] = None,
    user: Optional[User] = None,
    notes: Optional[str] = None,
    request: Optional[OrderOpenRequest] = None,
    current_user: Optional[User] = None,
    ip: Optional[str] = None
) -> Order:
    op_user = current_user or user
    c_num = card_number or (request.card_number if request else "")
    c_notes = notes if notes is not None else (request.notes if request else None)
    
    clean_num = c_num.strip()
    card = db.query(Card).filter(Card.number == clean_num).with_for_update().first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cartão '{clean_num}' não cadastrado no sistema."
        )

    if card.status == CardStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cartão '{clean_num}' está BLOQUEADO e não pode ser utilizado."
        )

    existing_open = db.query(Order).filter(
        Order.card_id == card.id,
        Order.status == OrderStatus.OPEN
    ).first()
    if existing_open or card.status == CardStatus.IN_USE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cartão '{clean_num}' já possui uma comanda aberta."
        )

    order = Order(
        card_id=card.id,
        card_number_snapshot=card.number,
        status=OrderStatus.OPEN,
        opened_by_id=op_user.id if op_user else None,
        opened_at=datetime.now(timezone.utc),
        total_amount=Decimal("0.00"),
        total_paid=Decimal("0.00"),
        balance=Decimal("0.00"),
        notes=c_notes
    )
    db.add(order)
    card.status = CardStatus.IN_USE
    
    db.commit()
    db.refresh(order)

    record_audit(
        db, op_user, "ORDER_OPEN", "Order", order.id,
        {"card_number": card.number, "notes": c_notes}, ip
    )
    db.commit()
    return order

def add_items_to_order(
    db: Session,
    order_id: str,
    items_input: Optional[List[CartItemInput]] = None,
    items_in: Optional[List[CartItemInput]] = None,
    user: Optional[User] = None,
    current_user: Optional[User] = None,
    idempotency_key: Optional[str] = None,
    ip: Optional[str] = None
) -> Order:
    op_user = current_user or user
    items_list = items_input if items_input is not None else (items_in or [])

    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comanda não encontrada.")
    if order.status != OrderStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível lançar itens em uma comanda encerrada.")

    if idempotency_key:
        already_processed = db.query(OrderItem).filter(
            OrderItem.order_id == order.id,
            OrderItem.idempotency_key == idempotency_key
        ).first()
        if already_processed:
            return order

    audit_items = []
    for item_data in items_list:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Produto ID {item_data.product_id} não cadastrado.")
        if not product.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Produto '{product.name}' está inativo no cardápio.")

        qty = Decimal(str(item_data.quantity))
        unit_price = Decimal(str(product.price)).quantize(Decimal("0.01"))
        subtotal = (qty * unit_price).quantize(Decimal("0.01"))

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name_snapshot=product.name,
            unit_price_snapshot=unit_price,
            quantity=qty,
            subtotal=subtotal,
            status=OrderItemStatus.ACTIVE,
            created_by_id=op_user.id if op_user else None,
            created_at=datetime.now(timezone.utc),
            idempotency_key=idempotency_key
        )
        db.add(order_item)
        audit_items.append({
            "product": product.name,
            "quantity": str(qty),
            "unit_price": str(unit_price),
            "subtotal": str(subtotal)
        })

    db.flush()
    recalculate_order_totals(db, order)
    db.commit()
    db.refresh(order)

    record_audit(
        db, op_user, "ORDER_ITEMS_ADD", "Order", order.id,
        {"items": audit_items, "new_total": str(order.total_amount), "balance": str(order.balance)}, ip
    )
    db.commit()
    return order

def cancel_order_item(
    db: Session,
    item_id: int,
    reason: str,
    user: Optional[User] = None,
    current_user: Optional[User] = None,
    order_id: Optional[str] = None,
    ip: Optional[str] = None
) -> OrderItem:
    op_user = current_user or user
    item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item de comanda não encontrado.")
    if item.status == OrderItemStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este item já foi cancelado.")
    
    order = db.query(Order).filter(Order.id == item.order_id).with_for_update().first()
    if order.status != OrderStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível estornar itens de comanda encerrada.")

    item.status = OrderItemStatus.CANCELLED
    item.cancellation_reason = reason.strip()
    item.cancelled_by_id = op_user.id if op_user else None
    item.cancelled_at = datetime.now(timezone.utc)
    db.flush()

    recalculate_order_totals(db, order)
    db.commit()
    db.refresh(item)
    db.refresh(order)

    record_audit(
        db, op_user, "ORDER_ITEM_CANCEL", "OrderItem", str(item.id),
        {
            "order_id": order.id,
            "product_name": item.product_name_snapshot,
            "subtotal_cancelled": str(item.subtotal),
            "reason": reason
        },
        ip
    )
    db.commit()
    return item

cancel_order_item_by_id = cancel_order_item

def get_order_by_id(db: Session, order_id: str) -> Optional[Order]:
    return db.query(Order).filter(Order.id == order_id).first()

def get_open_order_by_card_number(db: Session, card_number: str) -> Optional[Order]:
    clean_num = card_number.strip()
    card = db.query(Card).filter(Card.number == clean_num).first()
    if not card:
        return None
    return db.query(Order).filter(Order.card_id == card.id, Order.status == OrderStatus.OPEN).first()

get_active_order_by_card = get_open_order_by_card_number

def list_orders(
    db: Session,
    status_filter: Optional[OrderStatus] = None,
    card_number: Optional[str] = None,
    limit: int = 50
) -> List[Order]:
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if card_number:
        clean_num = card_number.strip()
        query = query.filter(Order.card_number_snapshot.ilike(f"%{clean_num}%"))
    return query.order_by(Order.opened_at.desc()).limit(limit).all()

list_active_orders = lambda db: list_orders(db, status_filter=OrderStatus.OPEN)

def close_order(db: Session, order_id: str, user: User, ip: Optional[str] = None) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comanda não encontrada."
        )
    if order.status == OrderStatus.CLOSED:
        return order
    if order.status != OrderStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Comanda não pode ser encerrada pois seu status é {order.status.value}."
        )
        
    recalculate_order_totals(db, order)
    
    if order.balance > Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível encerrar comanda com saldo pendente (R$ {order.balance}). Realize o pagamento primeiro."
        )

    order.status = OrderStatus.CLOSED
    order.closed_by_id = user.id
    order.closed_at = datetime.now(timezone.utc)
    
    # Liberar cartão físico para reutilização
    card = db.query(Card).filter(Card.id == order.card_id).first()
    if card and card.status != CardStatus.BLOCKED:
        card.status = CardStatus.AVAILABLE

    db.commit()
    db.refresh(order)
    return order

