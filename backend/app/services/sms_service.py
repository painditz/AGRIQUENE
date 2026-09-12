"""
AGRIQUENE SMS Service Gateway Abstraction
Handles generation and dispatching of official government-style SMS alerts to farmers for:
1. Slot Booking & Token Generation
2. Queue Updates & Turn Approaching Notice
3. Token Called Notice
4. Procurement Completion Receipt
5. DBT Payment Processing & Credit Alerts
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from ..models.models import SMSLog
from ..core.config import settings

logger = logging.getLogger("agriquene.sms")

class SMSService:
    def __init__(self):
        self.provider = settings.SMS_GATEWAY_PROVIDER
        self.api_key = settings.SMS_API_KEY
        # In-memory recent logs for fast UI inspection in demo
        self.recent_in_memory_logs: List[Dict[str, Any]] = []

    def send_sms(
        self,
        db: Session,
        mobile_number: str,
        message: str,
        trigger_event: str
    ) -> Dict[str, Any]:
        """
        Dispatches SMS via configured provider (or mock simulation) and logs to database.
        """
        # Formulate official gov header prefix
        full_message = f"[AGRIQUENE-GOV] {message}"
        
        status = "SENT"
        provider_resp = "SUCCESS: 200 OK (Mock SMS Dispatch)"
        
        if self.provider == "fast2sms" and self.api_key:
            # Placeholder for live Fast2SMS HTTP POST
            try:
                # import requests
                # resp = requests.post(...)
                provider_resp = "Fast2SMS Delivered"
            except Exception as e:
                status = "FAILED"
                provider_resp = str(e)
                logger.error(f"Failed to dispatch SMS via provider: {e}")

        # Record in DB
        log_entry = SMSLog(
            mobile_number=mobile_number,
            message=full_message,
            trigger_event=trigger_event,
            status=status
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        
        log_item = {
            "id": log_entry.id,
            "mobile_number": mobile_number,
            "message": full_message,
            "trigger_event": trigger_event,
            "status": status,
            "sent_at": log_entry.sent_at.strftime("%I:%M %p, %d %b %Y")
        }
        self.recent_in_memory_logs.insert(0, log_item)
        if len(self.recent_in_memory_logs) > 50:
            self.recent_in_memory_logs.pop()
            
        logger.info(f"SMS SENT to {mobile_number} for event [{trigger_event}]: {full_message}")
        return log_item

    # Standard Trigger Helpers
    def notify_token_generated(self, db: Session, mobile: str, token_display: str, centre_name: str, wait_min: int, turn_time: str):
        msg = f"Token {token_display} confirmed at {centre_name}. Est. wait: {wait_min} min. Expected turn: {turn_time}. Track live at agriquene.gov.in"
        return self.send_sms(db, mobile, msg, "TOKEN_GENERATED")

    def notify_queue_movement(self, db: Session, mobile: str, token_display: str, position: int, wait_min: int):
        msg = f"Queue update for {token_display}: {position} farmers ahead. Est. wait: {wait_min} min."
        return self.send_sms(db, mobile, msg, "QUEUE_MOVEMENT")

    def notify_turn_approaching(self, db: Session, mobile: str, token_display: str, centre_name: str, wait_min: int):
        msg = f"URGENT: Your turn for {token_display} at {centre_name} is approaching (Est. {wait_min} min). Please reach the centre now."
        return self.send_sms(db, mobile, msg, "TURN_APPROACHING")

    def notify_token_called(self, db: Session, mobile: str, token_display: str, counter_num: int):
        msg = f"Token {token_display} CALLED at Counter #{counter_num}. Please proceed immediately with your produce for weighing."
        return self.send_sms(db, mobile, msg, "TOKEN_CALLED")

    def notify_procurement_completed(self, db: Session, mobile: str, token_display: str, crop: str, net_wt: float, amount: float, receipt_no: str):
        msg = f"Procurement completed for {token_display}. Crop: {crop}, Net: {net_wt:.2f} Qtl. Total: Rs.{amount:,.2f}. Receipt #{receipt_no} generated."
        return self.send_sms(db, mobile, msg, "PROCUREMENT_COMPLETED")

    def notify_payment_initiated(self, db: Session, mobile: str, amount: float, txn_ref: str, bank_masked: str):
        msg = f"DBT payment of Rs.{amount:,.2f} initiated to A/C {bank_masked}. Ref: {txn_ref}. Credit expected within 24-48 hrs."
        return self.send_sms(db, mobile, msg, "PAYMENT_INITIATED")

sms_service = SMSService()
