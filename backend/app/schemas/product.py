from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    category_id: int
    price: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    price: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=2)
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
