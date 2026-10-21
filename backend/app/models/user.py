import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole, name="user_role_enum", values_callable=lambda obj: [e.value for e in obj]), default=UserRole.OPERATOR, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    orders_opened = relationship("Order", foreign_keys="[Order.opened_by_id]", back_populates="opened_by")
    orders_closed = relationship("Order", foreign_keys="[Order.closed_by_id]", back_populates="closed_by")
    payments_registered = relationship("Payment", foreign_keys="[Payment.user_id]", back_populates="user")
    cash_sessions_opened = relationship("CashSession", foreign_keys="[CashSession.opened_by_id]", back_populates="opened_by")
    cash_sessions_closed = relationship("CashSession", foreign_keys="[CashSession.closed_by_id]", back_populates="closed_by")
