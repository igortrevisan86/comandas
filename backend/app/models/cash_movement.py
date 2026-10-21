import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class MovementType(str, enum.Enum):
    SUPPLY = "supply"  # Suprimento / Entrada manual
    DRAIN = "drain"    # Sangria / Retirada manual

class CashMovement(Base):
    __tablename__ = "cash_movements"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("cash_sessions.id"), nullable=False, index=True)
    movement_type = Column(Enum(MovementType, name="movement_type_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    reason = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    session = relationship("CashSession", back_populates="movements")
    user = relationship("User")
