import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class OrderItemStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    
    # Snapshot of product details at the moment of addition
    product_name_snapshot = Column(String(150), nullable=False)
    unit_price_snapshot = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Numeric(10, 3), default=1.000, nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    
    status = Column(Enum(OrderItemStatus, name="order_item_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=OrderItemStatus.ACTIVE, nullable=False, index=True)
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Idempotency token to avoid double-posting items on click retry
    idempotency_key = Column(String(64), nullable=True, index=True)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
    created_by = relationship("User", foreign_keys=[created_by_id])
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_id])
    split_assignments = relationship("OrderSplitItem", back_populates="order_item", cascade="all, delete-orphan")
