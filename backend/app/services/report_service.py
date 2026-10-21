from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem, OrderItemStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus

def get_financial_summary(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Dict[str, Any]:
    # Filter payments
    p_query = db.query(Payment).filter(Payment.status == PaymentStatus.COMPLETED)
    if start_date:
        p_query = p_query.filter(Payment.created_at >= start_date)
    if end_date:
        p_query = p_query.filter(Payment.created_at <= end_date)
    payments = p_query.all()

    by_method = {
        "cash": Decimal("0.00"),
        "pix": Decimal("0.00"),
        "debit": Decimal("0.00"),
        "credit": Decimal("0.00")
    }
    total_received = Decimal("0.00")
    for p in payments:
        amt = Decimal(str(p.amount))
        method_str = p.method.value
        if method_str in by_method:
            by_method[method_str] += amt
        total_received += amt

    # Orders count
    o_query = db.query(Order)
    if start_date:
        o_query = o_query.filter(Order.opened_at >= start_date)
    if end_date:
        o_query = o_query.filter(Order.opened_at <= end_date)
    all_orders = o_query.all()

    total_orders = len(all_orders)
    open_orders = sum(1 for o in all_orders if o.status == OrderStatus.OPEN)
    closed_orders = sum(1 for o in all_orders if o.status == OrderStatus.CLOSED)
    
    # Cancellations
    item_cancel_query = db.query(OrderItem).filter(OrderItem.status == OrderItemStatus.CANCELLED)
    if start_date:
        item_cancel_query = item_cancel_query.filter(OrderItem.cancelled_at >= start_date)
    if end_date:
        item_cancel_query = item_cancel_query.filter(OrderItem.cancelled_at <= end_date)
    cancelled_items = item_cancel_query.all()

    total_cancelled_amount = Decimal("0.00")
    for ci in cancelled_items:
        total_cancelled_amount += Decimal(str(ci.subtotal))

    # Top selling active items
    item_query = db.query(
        OrderItem.product_name_snapshot,
        func.sum(OrderItem.quantity).label("total_qty"),
        func.sum(OrderItem.subtotal).label("total_subtotal")
    ).filter(
        OrderItem.status == OrderItemStatus.ACTIVE
    )
    if start_date:
        item_query = item_query.filter(OrderItem.created_at >= start_date)
    if end_date:
        item_query = item_query.filter(OrderItem.created_at <= end_date)
    
    top_products_raw = item_query.group_by(OrderItem.product_name_snapshot).order_by(func.sum(OrderItem.subtotal).desc()).limit(10).all()
    
    top_products = [
        {
            "name": row[0],
            "quantity": float(row[1]) if row[1] is not None else 0.0,
            "revenue": float(row[2]) if row[2] is not None else 0.0
        }
        for row in top_products_raw
    ]

    return {
        "period": {
            "start": start_date.isoformat() if start_date else None,
            "end": end_date.isoformat() if end_date else None
        },
        "total_revenue": float(total_received),
        "payments_by_method": {k: float(v) for k, v in by_method.items()},
        "orders_summary": {
            "total": total_orders,
            "open": open_orders,
            "closed": closed_orders
        },
        "cancellations": {
            "count": len(cancelled_items),
            "total_amount": float(total_cancelled_amount)
        },
        "top_products": top_products
    }

def get_audit_trail(
    db: Session,
    action: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
) -> List[Dict[str, Any]]:
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": l.id,
            "username": l.username_snapshot,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]
