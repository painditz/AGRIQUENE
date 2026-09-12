import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from ..models.models import AuditLog

logger = logging.getLogger("agriquene.audit")

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        user_id: Optional[int] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Optional[AuditLog]:
        """
        Record an immutable system audit entry.
        Catches any exception so primary transactional operations are never blocked.
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id is not None else None,
                details=details,
                ip_address=ip_address,
                created_at=datetime.utcnow()
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            return log_entry
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")
            try:
                db.rollback()
            except Exception:
                pass
            return None

audit_service = AuditService()
