from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict
from pydantic import BaseModel

class DashboardStats(BaseModel):
    open_orders_count: int
    pending_payment_orders_count: int
    closed_orders_count: int
    total_consumption_period: Decimal
    total_received_period: Decimal
    total_cancelled_period: Decimal
    total_pending_balance: Decimal
    active_cash_session_id: Optional[int] = None
    active_cash_session_opened_at: Optional[datetime] = None

class TopProductItem(BaseModel):
    product_id: Optional[int]
    product_name: str
    quantity_sold: Decimal
    total_amount: Decimal

class PaymentMethodSummary(BaseModel):
    method: str
    count: int
    total_amount: Decimal

class SalesReportResponse(BaseModel):
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    total_consumption: Decimal
    total_received: Decimal
    total_cancelled: Decimal
    total_pending_balance: Decimal
    orders_opened_count: int
    orders_closed_count: int
    payments_by_method: List[PaymentMethodSummary]
    top_products: List[TopProductItem]
