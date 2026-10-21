import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class CardStatus(str, enum.Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    BLOCKED = "blocked"

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(20), unique=True, index=True, nullable=False)
    status = Column(Enum(CardStatus, name="card_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=CardStatus.AVAILABLE, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    orders = relationship("Order", back_populates="card", order_by="desc(Order.opened_at)")
