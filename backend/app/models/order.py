import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, Text, Numeric, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.db.session import Base

class OrderStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False, index=True)
    card_number_snapshot = Column(String(20), nullable=False, index=True)
    status = Column(Enum(OrderStatus, name="order_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=OrderStatus.OPEN, nullable=False, index=True)
    
    opened_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    opened_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    closed_at = Column(DateTime, nullable=True)
    
    total_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    total_paid = Column(Numeric(10, 2), default=0.00, nullable=False)
    balance = Column(Numeric(10, 2), default=0.00, nullable=False)
    
    notes = Column(Text, nullable=True)

    # Relationships
    card = relationship("Card", back_populates="orders")
    opened_by = relationship("User", foreign_keys=[opened_by_id], back_populates="orders_opened")
    closed_by = relationship("User", foreign_keys=[closed_by_id], back_populates="orders_closed")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.created_at")
    splits = relationship("OrderSplit", back_populates="order", cascade="all, delete-orphan", order_by="OrderSplit.id")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan", order_by="Payment.created_at")
