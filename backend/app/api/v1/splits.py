from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.split import (
    EqualSplitRequest,
    ItemSplitRequest,
    OrderSplitItemResponse,
    SplitResponse,
)
from app.services import split_service

router = APIRouter(prefix="/orders/{order_id}/split", tags=["Divisão de Comanda"])

def format_splits(splits) -> List[SplitResponse]:
    result = []
    for s in splits:
        split_items = [
            OrderSplitItemResponse(
                id=si.id,
                order_item_id=si.order_item_id,
                product_name=si.order_item.product_name_snapshot if si.order_item else None,
                quantity_fraction=Decimal(str(si.quantity_fraction)),
                assigned_amount=Decimal(str(si.assigned_amount))
            )
            for si in s.assigned_items
        ]
        result.append(
            SplitResponse(
                id=s.id,
                order_id=s.order_id,
                participant_name=s.participant_name,
                split_type=s.split_type,
                target_amount=Decimal(str(s.target_amount)),
                paid_amount=Decimal(str(s.paid_amount)),
                status=s.status,
                created_at=s.created_at,
                assigned_items=split_items
            )
        )
    return result

@router.post("/equal", response_model=List[SplitResponse], status_code=status.HTTP_200_OK)
def split_equal(
    order_id: str,
    split_req: EqualSplitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    splits = split_service.create_equal_split(
        db=db,
        order_id=order_id,
        num_participants=split_req.num_participants,
        user=current_user
    )
    return format_splits(splits)

@router.post("/by-item", response_model=List[SplitResponse], status_code=status.HTTP_200_OK)
@router.post("/by-items", response_model=List[SplitResponse], status_code=status.HTTP_200_OK)
def split_by_item(
    order_id: str,
    split_req: ItemSplitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    splits = split_service.create_item_split(
        db=db,
        order_id=order_id,
        split_req=split_req,
        user=current_user
    )
    return format_splits(splits)
