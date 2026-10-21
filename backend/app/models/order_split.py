import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class SplitType(str, enum.Enum):
    EQUAL = "equal"
    BY_ITEM = "by_item"

class SplitStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"

class OrderSplit(Base):
    __tablename__ = "order_splits"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False, index=True)
    participant_name = Column(String(100), nullable=False)
    split_type = Column(Enum(SplitType, name="split_type_enum", values_callable=lambda obj: [e.value for e in obj]), default=SplitType.EQUAL, nullable=False)
    
    target_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    status = Column(Enum(SplitStatus, name="split_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=SplitStatus.PENDING, nullable=False, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="splits")
    assigned_items = relationship("OrderSplitItem", back_populates="split", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="split")
