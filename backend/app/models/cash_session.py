import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class CashSessionStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"

class CashSession(Base):
    __tablename__ = "cash_sessions"

    id = Column(Integer, primary_key=True, index=True)
    opened_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    initial_cash = Column(Numeric(10, 2), default=0.00, nullable=False)
    final_cash_counted = Column(Numeric(10, 2), nullable=True)
    expected_cash = Column(Numeric(10, 2), nullable=True)
    difference = Column(Numeric(10, 2), nullable=True)
    
    status = Column(Enum(CashSessionStatus, name="cash_session_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=CashSessionStatus.OPEN, nullable=False, index=True)
    
    opened_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    closed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    opened_by = relationship("User", foreign_keys=[opened_by_id], back_populates="cash_sessions_opened")
    closed_by = relationship("User", foreign_keys=[closed_by_id], back_populates="cash_sessions_closed")
    movements = relationship("CashMovement", back_populates="session", cascade="all, delete-orphan", order_by="CashMovement.created_at")
    payments = relationship("Payment", back_populates="cash_session")
