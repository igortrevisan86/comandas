from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    username_snapshot = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)  # ex: ORDER_OPEN, ORDER_ITEM_ADD, ORDER_ITEM_CANCEL, PAYMENT_ADD, PAYMENT_CANCEL, CASH_OPEN, CASH_CLOSE
    entity_type = Column(String(50), nullable=False, index=True)  # ex: Order, OrderItem, Payment, Card, Product, CashSession
    entity_id = Column(String(100), nullable=True, index=True)
    details = Column(Text, nullable=True)  # JSON-encoded description of changes, reasons, etc.
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User")
