import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class PaymentMethod(str, enum.Enum):
    CASH = "cash"      # Dinheiro
    PIX = "pix"        # Pix
    DEBIT = "debit"    # Cartão de Débito
    CREDIT = "credit"  # Cartão de Crédito

class PaymentStatus(str, enum.Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False, index=True)
    split_id = Column(Integer, ForeignKey("order_splits.id"), nullable=True, index=True)
    cash_session_id = Column(Integer, ForeignKey("cash_sessions.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    method = Column(Enum(PaymentMethod, name="payment_method_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)  # Valor efetivamente abatido da dívida
    amount_received = Column(Numeric(10, 2), nullable=True)  # Valor entregue em dinheiro pelo cliente
    change_amount = Column(Numeric(10, 2), default=0.00, nullable=False)  # Troco devolvido
    
    status = Column(Enum(PaymentStatus, name="payment_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=PaymentStatus.COMPLETED, nullable=False, index=True)
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    notes = Column(Text, nullable=True)
    reference_code = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    order = relationship("Order", back_populates="payments")
    split = relationship("OrderSplit", back_populates="payments")
    cash_session = relationship("CashSession", back_populates="payments")
    user = relationship("User", foreign_keys=[user_id], back_populates="payments_registered")
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_id])
