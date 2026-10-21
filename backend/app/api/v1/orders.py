from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.order import (
    OrderAddItemsRequest,
    OrderItemCancelRequest,
    OrderItemResponse,
    OrderOpenRequest,
    OrderResponse,
    OrderSummaryResponse,
)
from app.schemas.payment import PaymentResponse
from app.schemas.split import OrderSplitItemResponse, SplitResponse
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["Comandas"])

def build_order_summary(order: Order) -> OrderSummaryResponse:
    items_dto = [
        OrderItemResponse(
            id=i.id,
            order_id=i.order_id,
            product_id=i.product_id,
            product_name_snapshot=i.product_name_snapshot,
            unit_price_snapshot=Decimal(str(i.unit_price_snapshot)),
            quantity=Decimal(str(i.quantity)),
            subtotal=Decimal(str(i.subtotal)),
            status=i.status,
            cancellation_reason=i.cancellation_reason,
            cancelled_at=i.cancelled_at,
            created_at=i.created_at,
            created_by_name=i.created_by.full_name if i.created_by else None
        )
        for i in order.items
    ]

    payments_dto = [
        PaymentResponse(
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
        for p in order.payments
    ]

    splits_dto = []
    for s in order.splits:
        split_items_dto = [
            OrderSplitItemResponse(
                id=si.id,
                order_item_id=si.order_item_id,
                product_name=si.order_item.product_name_snapshot if si.order_item else None,
                quantity_fraction=Decimal(str(si.quantity_fraction)),
                assigned_amount=Decimal(str(si.assigned_amount))
            )
            for si in s.assigned_items
        ]
        splits_dto.append(
            SplitResponse(
                id=s.id,
                order_id=s.order_id,
                participant_name=s.participant_name,
                split_type=s.split_type,
                target_amount=Decimal(str(s.target_amount)),
                paid_amount=Decimal(str(s.paid_amount)),
                status=s.status,
                created_at=s.created_at,
                assigned_items=split_items_dto
            )
        )

    return OrderSummaryResponse(
        id=order.id,
        card_id=order.card_id,
        card_number_snapshot=order.card_number_snapshot,
        status=order.status,
        opened_by_name=order.opened_by.full_name if order.opened_by else None,
        closed_by_name=order.closed_by.full_name if order.closed_by else None,
        opened_at=order.opened_at,
        closed_at=order.closed_at,
        total_amount=Decimal(str(order.total_amount)),
        total_paid=Decimal(str(order.total_paid)),
        balance=Decimal(str(order.balance)),
        notes=order.notes,
        items=items_dto,
        payments=payments_dto,
        splits=splits_dto
    )

@router.post("/open", response_model=OrderSummaryResponse, status_code=status.HTTP_200_OK)
def open_order(
    open_req: OrderOpenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = order_service.open_order(
        db=db,
        card_number=open_req.card_number,
        user=current_user,
        notes=open_req.notes
    )
    return build_order_summary(order)

@router.get("/active", response_model=List[OrderResponse])
def list_active_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    orders = order_service.list_active_orders(db)
    return [
        OrderResponse(
            id=o.id,
            card_id=o.card_id,
            card_number_snapshot=o.card_number_snapshot,
            status=o.status,
            opened_by_name=o.opened_by.full_name if o.opened_by else None,
            closed_by_name=o.closed_by.full_name if o.closed_by else None,
            opened_at=o.opened_at,
            closed_at=o.closed_at,
            total_amount=Decimal(str(o.total_amount)),
            total_paid=Decimal(str(o.total_paid)),
            balance=Decimal(str(o.balance)),
            notes=o.notes
        )
        for o in orders
    ]

@router.get("/by-card/{card_number}", response_model=Optional[OrderSummaryResponse])
def get_order_by_card(
    card_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = order_service.get_active_order_by_card(db, card_number)
    if not order:
        return None
    return build_order_summary(order)

@router.get("/{order_id}", response_model=OrderSummaryResponse)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = order_service.get_order_by_id(db, order_id)
    return build_order_summary(order)

@router.post("/{order_id}/items", response_model=OrderSummaryResponse)
def add_items_to_order(
    order_id: str,
    items_req: OrderAddItemsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = order_service.add_items_to_order(
        db=db,
        order_id=order_id,
        items_input=items_req.items,
        user=current_user,
        idempotency_key=items_req.idempotency_key
    )
    return build_order_summary(order)

@router.post("/items/{item_id}/cancel", response_model=OrderItemResponse)
def cancel_order_item_direct(
    item_id: int,
    cancel_req: OrderItemCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = order_service.cancel_order_item_by_id(
        db=db,
        item_id=item_id,
        reason=cancel_req.reason,
        user=current_user
    )
    return OrderItemResponse(
        id=item.id,
        order_id=item.order_id,
        product_id=item.product_id,
        product_name_snapshot=item.product_name_snapshot,
        unit_price_snapshot=Decimal(str(item.unit_price_snapshot)),
        quantity=Decimal(str(item.quantity)),
        subtotal=Decimal(str(item.subtotal)),
        status=item.status,
        cancellation_reason=item.cancellation_reason,
        cancelled_at=item.cancelled_at,
        created_at=item.created_at,
        created_by_name=item.created_by.full_name if item.created_by else None
    )

@router.post("/{order_id}/items/{item_id}/cancel", response_model=OrderSummaryResponse)
def cancel_order_item(
    order_id: str,
    item_id: int,
    cancel_req: OrderItemCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order_service.cancel_order_item(
        db=db,
        order_id=order_id,
        item_id=item_id,
        reason=cancel_req.reason,
        user=current_user
    )
    order = order_service.get_order_by_id(db, order_id)
    return build_order_summary(order)

@router.post("/{order_id}/close", response_model=OrderSummaryResponse, status_code=status.HTTP_200_OK)
def close_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = order_service.close_order(db=db, order_id=order_id, user=current_user)
    return build_order_summary(order)
