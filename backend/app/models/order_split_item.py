from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class OrderSplitItem(Base):
    __tablename__ = "order_split_items"

    id = Column(Integer, primary_key=True, index=True)
    split_id = Column(Integer, ForeignKey("order_splits.id"), nullable=False, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=False, index=True)
    
    # Fraction or quantity allocated to this participant (e.g. 1.0 or 0.500)
    quantity_fraction = Column(Numeric(10, 3), default=1.000, nullable=False)
    # Monetary portion attributed to this participant
    assigned_amount = Column(Numeric(10, 2), nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    split = relationship("OrderSplit", back_populates="assigned_items")
    order_item = relationship("OrderItem", back_populates="split_assignments")
