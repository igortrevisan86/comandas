from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_admin, get_current_user, get_db
from app.models.user import User
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Relatórios e Auditoria"])

@router.get("/financial")
def get_financial_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    return report_service.get_financial_summary(db, start_date=start_date, end_date=end_date)

@router.get("/audit")
def get_audit_trail(
    action: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    return report_service.get_audit_trail(db, action=action, limit=limit, skip=skip)
