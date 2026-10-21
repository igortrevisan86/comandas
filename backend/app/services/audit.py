import json
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_audit(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user_id: Optional[int] = None,
    username_snapshot: str = "SYSTEM",
    details: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Registra uma entrada imutável de trilha de auditoria para ações sensíveis do sistema.
    """
    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details, default=str, ensure_ascii=False)
        else:
            details_str = str(details)

    log_entry = AuditLog(
        user_id=user_id,
        username_snapshot=username_snapshot,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.flush()
    return log_entry
