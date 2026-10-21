import json
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User

def record_audit(
    db: Session,
    user: Optional[User],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    username = user.username if user else "SYSTEM"
    user_id = user.id if user else None
    
    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details, default=str, ensure_ascii=False)
        else:
            details_str = str(details)

    log_entry = AuditLog(
        user_id=user_id,
        username_snapshot=username,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.flush()
    return log_entry
