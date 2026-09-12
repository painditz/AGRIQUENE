from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from ..db.session import get_db
from ..models.models import Payment, PaymentStatus
from ..schemas.schemas import PaymentResponse, PaymentUpdateStatusRequest
from ..services.sms_service import sms_service
from ..services.notification_service import notification_service
from ..services.audit_service import audit_service
from ..core.websocket import manager

router = APIRouter(prefix="/payments", tags=["Payment Tracking"])

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment_detail(payment_id: int, db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    proc = p.procurement
    farmer_user = p.farmer.user if p.farmer else None
    
    return PaymentResponse(
        id=p.id,
        procurement_id=p.procurement_id,
        receipt_number=proc.receipt_number if proc else "N/A",
        farmer_id=p.farmer_id,
        farmer_name=farmer_user.full_name if farmer_user else "Farmer",
        crop=proc.crop_name if proc else "Wheat",
        net_weight_quintals=proc.net_weight_quintals if proc else 40.0,
        amount=p.amount,
        transaction_ref=p.transaction_ref,
        utr_number=p.utr_number,
        bank_account_masked=p.bank_account_masked,
        bank_name=p.bank_name,
        payment_mode=p.payment_mode,
        status=p.status,
        initiated_at=p.initiated_at,
        completed_at=p.completed_at
    )

@router.put("/{payment_id}/status", response_model=PaymentResponse)
async def update_payment_status(payment_id: int, payload: PaymentUpdateStatusRequest, db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    p.status = payload.status
    if payload.utr_number:
        p.utr_number = payload.utr_number
    if payload.status == PaymentStatus.COMPLETED:
        p.completed_at = datetime.utcnow()
        
    db.commit()
    db.refresh(p)

    proc = p.procurement
    farmer_user = p.farmer.user if p.farmer else None
    
    # Notify farmer of credit
    if payload.status == PaymentStatus.COMPLETED and farmer_user:
        sms_service.send_sms(
            db, farmer_user.mobile_number,
            f"DBT SUCCESS: Rs.{p.amount:,.2f} credited to your bank account {p.bank_account_masked}. UTR: {p.utr_number}. PFMS Ref: {p.transaction_ref}.",
            "PAYMENT_COMPLETED"
        )
        notification_service.create_notification(
            db, farmer_user.id,
            "Payment Credited Successfully",
            f"Rs. {p.amount:,.2f} has been transferred via DBT. UTR: {p.utr_number}.",
            "PAYMENT"
        )

    await manager.broadcast_global({
        "type": "PAYMENT_STATUS_UPDATED",
        "payment_id": p.id,
        "status": p.status.value,
        "farmer_id": p.farmer_id,
        "amount": p.amount,
        "timestamp": datetime.now().isoformat()
    })

    audit_service.log_event(
        db, action="PAYMENT_STATUS_UPDATED", entity_type="PAYMENT",
        entity_id=str(p.id),
        details=f"Payment {p.transaction_ref} updated to {p.status.value} (Amount: ₹{p.amount:,.2f}, UTR: {p.utr_number or 'N/A'})"
    )

    return PaymentResponse(
        id=p.id,
        procurement_id=p.procurement_id,
        receipt_number=proc.receipt_number if proc else "N/A",
        farmer_id=p.farmer_id,
        farmer_name=farmer_user.full_name if farmer_user else "Farmer",
        crop=proc.crop_name if proc else "Wheat",
        net_weight_quintals=proc.net_weight_quintals if proc else 40.0,
        amount=p.amount,
        transaction_ref=p.transaction_ref,
        utr_number=p.utr_number,
        bank_account_masked=p.bank_account_masked,
        bank_name=p.bank_name,
        payment_mode=p.payment_mode,
        status=p.status,
        initiated_at=p.initiated_at,
        completed_at=p.completed_at
    )
