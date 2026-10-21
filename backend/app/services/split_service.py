from decimal import Decimal
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem, OrderItemStatus
from app.models.order_split import OrderSplit, SplitType, SplitStatus
from app.models.order_split_item import OrderSplitItem
from app.models.user import User
from app.schemas.split import ItemSplitRequest
from app.services.audit import log_audit

def create_equal_split(
    db: Session,
    order_id: str,
    num_participants: int,
    user: User
) -> List[OrderSplit]:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comanda não encontrada."
        )
    if order.status != OrderStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Divisão só permitida para comanda aberta."
        )

    target_balance = Decimal(str(order.balance))
    if target_balance <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comanda não possui saldo a ser dividido."
        )

    existing_splits = db.query(OrderSplit).filter(OrderSplit.order_id == order.id).all()
    for s in existing_splits:
        if s.paid_amount > Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Existem pagamentos já vinculados a divisões anteriores. Não é possível recriar a divisão."
            )
        db.delete(s)
    db.flush()

    total_cents = int(round(target_balance * 100))
    base_cents = total_cents // num_participants
    remainder = total_cents % num_participants

    splits = []
    for i in range(num_participants):
        cents = base_cents + (1 if i < remainder else 0)
        share = (Decimal(cents) / Decimal(100)).quantize(Decimal("0.01"))
        split = OrderSplit(
            order_id=order.id,
            participant_name=f"Participante {i + 1}",
            split_type=SplitType.EQUAL,
            target_amount=share,
            paid_amount=Decimal("0.00"),
            status=SplitStatus.PENDING
        )
        db.add(split)
        splits.append(split)

    log_audit(
        db,
        action="ORDER_SPLIT_EQUAL",
        entity_type="Order",
        entity_id=order.id,
        user_id=user.id,
        username_snapshot=user.username,
        details={"num_participants": num_participants, "balance": float(target_balance)}
    )

    db.commit()
    for s in splits:
        db.refresh(s)
    return splits

def create_item_split(
    db: Session,
    order_id: str,
    split_req: ItemSplitRequest,
    user: User
) -> List[OrderSplit]:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comanda não encontrada."
        )
    if order.status != OrderStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Divisão só permitida para comanda aberta."
        )

    # Validate that total fractions for each item do not exceed 100%
    item_fractions = {}
    for p_input in split_req.participants:
        for item_alloc in p_input.items:
            fid = item_alloc.order_item_id
            item_fractions[fid] = item_fractions.get(fid, Decimal("0.000")) + Decimal(str(item_alloc.quantity_fraction))

    for item_id, total_frac in item_fractions.items():
        if total_frac > Decimal("1.000"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A soma das frações atribuídas ao item {item_id} excede 100% (total: {total_frac * 100}%)."
            )

    # Clean existing pending splits without payments
    existing_splits = db.query(OrderSplit).filter(OrderSplit.order_id == order.id).all()
    for s in existing_splits:
        if s.paid_amount > Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Existem pagamentos vinculados a divisões anteriores. Não é possível recriar a divisão."
            )
        db.delete(s)
    db.flush()

    splits = []
    for p_input in split_req.participants:
        split = OrderSplit(
            order_id=order.id,
            participant_name=p_input.participant_name,
            split_type=SplitType.BY_ITEM,
            target_amount=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            status=SplitStatus.PENDING
        )
        db.add(split)
        db.flush()

        part_total = Decimal("0.00")
        for item_alloc in p_input.items:
            order_item = db.query(OrderItem).filter(
                OrderItem.id == item_alloc.order_item_id,
                OrderItem.order_id == order.id,
                OrderItem.status == OrderItemStatus.ACTIVE
            ).first()
            if not order_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item de consumo ID {item_alloc.order_item_id} não é válido ou está cancelado."
                )
            
            frac = Decimal(str(item_alloc.quantity_fraction))
            assigned_amount = (Decimal(str(order_item.subtotal)) * frac).quantize(Decimal("0.01"))
            part_total += assigned_amount
            
            split_item = OrderSplitItem(
                split_id=split.id,
                order_item_id=order_item.id,
                quantity_fraction=frac,
                assigned_amount=assigned_amount
            )
            db.add(split_item)

        split.target_amount = part_total
        splits.append(split)

    log_audit(
        db,
        action="ORDER_SPLIT_BY_ITEM",
        entity_type="Order",
        entity_id=order.id,
        user_id=user.id,
        username_snapshot=user.username,
        details={"participants_count": len(split_req.participants)}
    )

    db.commit()
    for s in splits:
        db.refresh(s)
    return splits
