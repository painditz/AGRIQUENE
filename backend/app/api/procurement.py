from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
from typing import List, Optional
from ..db.session import get_db
from ..models.models import (
    Token, TokenStatus, ProcurementRecord, Payment,
    PaymentStatus, Payout, PayoutStatus, Crop, Buyer, Farmer,
    UserRole, User
)
from ..schemas.schemas import ProcurementSubmitRequest, ProcurementResponse
from ..core.security import require_role
from ..services.sms_service import sms_service
from ..services.notification_service import notification_service
from ..services.payment_service import payment_service
from ..services.audit_service import audit_service
from ..core.websocket import manager

router = APIRouter(prefix="/procurement", tags=["Procurement Execution"])

@router.post("", response_model=ProcurementResponse)
async def submit_procurement(
    payload: ProcurementSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.BUYER, UserRole.ADMIN))
):
    token = db.query(Token).filter(Token.id == payload.token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    farmer = token.farmer
    if not farmer:
        raise HTTPException(status_code=400, detail="Farmer profile not associated with token")
        
    centre = token.centre
    crop_name = token.booking.crop_type if token.booking else "Wheat"
    
    # Fetch base MSP if not provided
    base_msp = payload.base_msp
    if not base_msp:
        crop_record = db.query(Crop).filter(Crop.name.ilike(f"%{crop_name.split()[0]}%")).first()
        base_msp = crop_record.msp_per_quintal if crop_record else 2275.0

    net_weight = max(0.1, payload.gross_weight_quintals - payload.tare_weight_quintals)
    total_amount = round((net_weight * base_msp) + payload.bonus_amount, 2)
    
    receipt_no = f"RCPT-{centre.code.split('-')[-2]}-2026-{token.token_number:03d}"
    
    # Create or update procurement record
    existing_record = db.query(ProcurementRecord).filter(ProcurementRecord.token_id == token.id).first()
    if existing_record:
        record = existing_record
        record.gross_weight_quintals = payload.gross_weight_quintals
        record.tare_weight_quintals = payload.tare_weight_quintals
        record.net_weight_quintals = net_weight
        record.moisture_pct = payload.moisture_pct
        record.quality_grade = payload.quality_grade
        record.base_msp = base_msp
        record.bonus_amount = payload.bonus_amount
        record.total_amount = total_amount
        record.status = "COMPLETED"
        record.verified_at = datetime.utcnow()
    else:
        record = ProcurementRecord(
            token_id=token.id,
            farmer_id=farmer.id,
            centre_id=centre.id,
            crop_name=crop_name,
            gross_weight_quintals=payload.gross_weight_quintals,
            tare_weight_quintals=payload.tare_weight_quintals,
            net_weight_quintals=net_weight,
            moisture_pct=payload.moisture_pct,
            quality_grade=payload.quality_grade,
            base_msp=base_msp,
            bonus_amount=payload.bonus_amount,
            total_amount=total_amount,
            receipt_number=receipt_no,
            status="COMPLETED",
            verified_at=datetime.utcnow()
        )
        db.add(record)
        
    token.status = TokenStatus.COMPLETED
    token.completed_at = datetime.utcnow()
    token.current_position = 0
    if token.queue_entry:
        token.queue_entry.is_active = False
        
    db.commit()
    db.refresh(record)

    # Initialize DBT Payment & Payout record
    payment = payment_service.create_payment_for_procurement(db, record, farmer)
    
    existing_payout = db.query(Payout).filter(Payout.procurement_id == record.id).first()
    if not existing_payout:
        payout_ref = f"PAYOUT-AGQ-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        payout = Payout(
            procurement_id=record.id,
            farmer_id=farmer.id,
            amount=total_amount,
            currency="INR",
            payout_ref=payout_ref,
            status=PayoutStatus.CREATED,
            bank_account_masked=farmer.bank_account_masked,
            bank_name=farmer.bank_name,
            ifsc_code=farmer.ifsc_code,
            created_at=datetime.utcnow()
        )
        db.add(payout)
        db.commit()

    # Dispatch SMS to Farmer
    farmer_user = farmer.user
    if farmer_user:
        sms_service.notify_procurement_completed(
            db, farmer_user.mobile_number,
            token.token_display, crop_name,
            net_weight, total_amount, receipt_no
        )
        sms_service.notify_payment_initiated(
            db, farmer_user.mobile_number,
            total_amount, payment.transaction_ref,
            farmer.bank_account_masked
        )
        notification_service.create_notification(
            db, farmer_user.id,
            "Procurement & Weighing Completed",
            f"Successfully procured {net_weight:.2f} Qtl of {crop_name}. Total: Rs. {total_amount:,.2f}. Receipt #{receipt_no}.",
            "PROCUREMENT"
        )

    # Broadcast real-time update
    await manager.broadcast_to_centre(str(centre.id), {
        "type": "PROCUREMENT_COMPLETED",
        "centre_id": centre.id,
        "token_id": token.id,
        "token_display": token.token_display,
        "receipt_number": receipt_no,
        "amount": total_amount,
        "timestamp": datetime.now().isoformat()
    })

    audit_service.log_event(
        db, action="PROCUREMENT_RECORDED", entity_type="PROCUREMENT",
        entity_id=str(record.id),
        details=f"Procurement {receipt_no} completed for Token {token.token_display}: {net_weight} Qtl {crop_name}, Total ₹{total_amount:,.2f}"
    )

    return ProcurementResponse(
        id=record.id,
        token_id=record.token_id,
        token_display=token.token_display,
        farmer_id=farmer.id,
        farmer_name=farmer_user.full_name if farmer_user else "Farmer",
        centre_name=centre.name,
        crop_name=record.crop_name,
        gross_weight_quintals=record.gross_weight_quintals,
        tare_weight_quintals=record.tare_weight_quintals,
        net_weight_quintals=record.net_weight_quintals,
        moisture_pct=record.moisture_pct,
        quality_grade=record.quality_grade,
        base_msp=record.base_msp,
        bonus_amount=record.bonus_amount,
        total_amount=record.total_amount,
        receipt_number=record.receipt_number,
        status=record.status,
        verified_at=record.verified_at,
        payment_status=payment.status,
        payment_transaction_ref=payment.transaction_ref
    )

@router.get("/{procurement_id}", response_model=ProcurementResponse)
def get_procurement(procurement_id: int, db: Session = Depends(get_db)):
    r = db.query(ProcurementRecord).filter(ProcurementRecord.id == procurement_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Procurement record not found")
        
    farmer_user = r.farmer.user if r.farmer else None
    pay = r.payment
    
    return ProcurementResponse(
        id=r.id,
        token_id=r.token_id,
        token_display=r.token.token_display if r.token else f"#{r.token_id}",
        farmer_id=r.farmer_id,
        farmer_name=farmer_user.full_name if farmer_user else "Farmer",
        centre_name=r.token.centre.name if r.token and r.token.centre else "Procurement Mandi",
        crop_name=r.crop_name,
        gross_weight_quintals=r.gross_weight_quintals,
        tare_weight_quintals=r.tare_weight_quintals,
        net_weight_quintals=r.net_weight_quintals,
        moisture_pct=r.moisture_pct,
        quality_grade=r.quality_grade,
        base_msp=r.base_msp,
        bonus_amount=r.bonus_amount,
        total_amount=r.total_amount,
        receipt_number=r.receipt_number,
        status=r.status,
        verified_at=r.verified_at,
        payment_status=pay.status if pay else PaymentStatus.PENDING,
        payment_transaction_ref=pay.transaction_ref if pay else None
    )
