from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models.models import Notification, SMSLog
from ..schemas.schemas import NotificationResponse, SMSLogResponse
from ..services.sms_service import sms_service

router = APIRouter(prefix="/notifications", tags=["Notifications & SMS"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    notifs = db.query(Notification).order_by(Notification.created_at.desc()).limit(30).all()
    return notifs

@router.get("/sms/logs", response_model=List[SMSLogResponse])
def get_sms_logs(db: Session = Depends(get_db)):
    logs = db.query(SMSLog).order_by(SMSLog.sent_at.desc()).limit(50).all()
    return logs

@router.post("/sms")
def send_custom_sms(
    mobile_number: str = Body(..., embed=True),
    message: str = Body(..., embed=True),
    trigger_event: str = Body("MANUAL_BROADCAST", embed=True),
    db: Session = Depends(get_db)
):
    res = sms_service.send_sms(db, mobile_number, message, trigger_event)
    return {"success": True, "data": res}
