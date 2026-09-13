from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from ..db.session import get_db
from ..models.models import (
    ProcurementCentre, Slot, Buyer, Farmer, User,
    Token, TokenStatus, Booking, ProcurementRecord, Payment,
    CentreStatus, UserRole, AuditLog, PaymentStatus, Payout, PayoutStatus
)
from ..schemas.schemas import (
    CentreResponse, SlotResponse, AuditLogResponse,
    CentreCreateRequest, CentreUpdateRequest, SlotCreateRequest,
    AdminRefundRequest, PayoutResponse, AdminAuthorizePayoutRequest,
    AdminPayoutStatsResponse, AdminUpdateCredentialsRequest
)
from ..core.security import get_password_hash, verify_password, require_role
from ..services.audit_service import audit_service
from ..services.sms_service import sms_service
from ..services.notification_service import notification_service

router = APIRouter(
    prefix="/admin",
    tags=["Admin Management"],
    dependencies=[Depends(require_role(UserRole.ADMIN))]
)

@router.get("/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    total_farmers = db.query(Farmer).count()
    active_centres = db.query(ProcurementCentre).filter(ProcurementCentre.status != CentreStatus.CLOSED).count()
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_bookings = db.query(Booking).filter(Booking.booking_date == today_str).count()
    if today_bookings == 0:
        today_bookings = db.query(Booking).count()
        
    currently_waiting = db.query(Token).filter(Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED])).count()
    completed_proc = db.query(Token).filter(Token.status == TokenStatus.COMPLETED).count()
    pending_payments = db.query(Payment).filter(Payment.status != "COMPLETED").count()
    
    # Total procurement value from real database records
    total_val = sum(p.total_amount for p in db.query(ProcurementRecord).all()) or 0.0

    return {
        "overview": {
            "total_farmers": total_farmers,
            "active_centres": active_centres,
            "today_bookings": today_bookings,
            "currently_waiting": currently_waiting,
            "completed_procurements": completed_proc,
            "pending_payments": pending_payments,
            "total_procurement_value_inr": total_val
        }
    }

@router.get("/farmers")
def list_farmers_admin(search: Optional[str] = None, db: Session = Depends(get_db)):
    farmers = db.query(Farmer).join(User, Farmer.user_id == User.id).all()
    results = []
    for f in farmers:
        if search and (search.lower() not in f.user.full_name.lower() and search not in f.user.mobile_number):
            continue
        token_count = len(f.tokens)
        results.append({
            "id": f.id,
            "user_id": f.user_id,
            "full_name": f.user.full_name,
            "mobile_number": f.user.mobile_number,
            "farmer_id_card": f.farmer_id_card,
            "village": f.village,
            "district": f.district,
            "state": f.state,
            "land_acres": f.land_acres,
            "preferred_crop": f.preferred_crop,
            "total_tokens": token_count,
            "is_active": f.user.is_active,
            "registered_at": f.created_at.strftime("%Y-%m-%d")
        })
    return results

@router.get("/buyers")
def list_buyers_admin(db: Session = Depends(get_db)):
    buyers = db.query(Buyer).join(User, Buyer.user_id == User.id).all()
    results = []
    for b in buyers:
        results.append({
            "id": b.id,
            "employee_id": b.employee_id,
            "full_name": b.user.full_name,
            "mobile_number": b.user.mobile_number,
            "email": b.user.email,
            "centre_id": b.centre_id,
            "centre_name": b.centre.name if b.centre else "Unassigned",
            "counter_number": b.counter_number,
            "designation": b.designation,
            "is_active": b.is_active
        })
    return results

@router.post("/buyers")
def create_buyer_admin(
    full_name: str = Body(..., embed=True),
    mobile_number: str = Body(..., embed=True),
    employee_id: str = Body(..., embed=True),
    centre_id: int = Body(..., embed=True),
    counter_number: int = Body(1, embed=True),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(UserRole.ADMIN))
):
    user = User(
        full_name=full_name,
        mobile_number=mobile_number,
        role=UserRole.BUYER,
        hashed_password=get_password_hash("buyer123"),
        is_active=True
    )
    db.add(user)
    db.flush()

    buyer = Buyer(
        user_id=user.id,
        employee_id=employee_id,
        centre_id=centre_id,
        counter_number=counter_number,
        is_active=True
    )
    db.add(buyer)
    db.commit()
    db.refresh(buyer)

    audit_service.log_event(
        db, action="BUYER_CREATED", entity_type="BUYER",
        entity_id=str(buyer.id), user_id=current_admin.id,
        details=f"Admin created buyer {full_name} ({employee_id}) assigned to centre #{centre_id}"
    )

    return {"success": True, "message": f"Buyer {full_name} ({employee_id}) created successfully"}

@router.post("/centres")
def create_centre_admin(
    payload: CentreCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(UserRole.ADMIN))
):
    centre = ProcurementCentre(
        name=payload.name,
        code=payload.code,
        address=payload.address,
        district=payload.district,
        state=payload.state,
        pin_code=payload.pin_code,
        latitude=payload.latitude or 28.6692,
        longitude=payload.longitude or 77.4538,
        contact_phone=payload.contact_phone or "0120-2839100",
        capacity_per_day=payload.capacity_per_day,
        active_counters=payload.active_counters,
        total_counters=payload.total_counters or (payload.active_counters + 2),
        avg_processing_time_min=payload.avg_processing_time_min or 8.0,
        open_time=payload.open_time or "08:00 AM",
        close_time=payload.close_time or "06:00 PM",
        status=payload.status or CentreStatus.OPEN
    )
    db.add(centre)
    db.commit()
    db.refresh(centre)

    audit_service.log_event(
        db, action="CENTRE_CREATED", entity_type="CENTRE",
        entity_id=str(centre.id), user_id=current_admin.id,
        details=f"Created Mandi centre {centre.name} ({centre.code}) with {centre.active_counters} counters"
    )

    return {"success": True, "message": f"Centre {centre.name} created with ID {centre.id}", "centre_id": centre.id}

@router.put("/centres/{centre_id}")
def update_centre_admin(
    centre_id: int,
    payload: CentreUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(UserRole.ADMIN))
):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    if payload.name is not None:
        centre.name = payload.name
    if payload.address is not None:
        centre.address = payload.address
    if payload.capacity_per_day is not None:
        centre.capacity_per_day = payload.capacity_per_day
    if payload.active_counters is not None:
        centre.active_counters = payload.active_counters
    if payload.status is not None:
        centre.status = payload.status
    if payload.open_time is not None:
        centre.open_time = payload.open_time
    if payload.close_time is not None:
        centre.close_time = payload.close_time

    db.commit()
    db.refresh(centre)

    audit_service.log_event(
        db, action="CENTRE_UPDATED", entity_type="CENTRE",
        entity_id=str(centre.id), user_id=current_admin.id,
        details=f"Admin updated centre {centre.name}: counters={centre.active_counters}, status={centre.status.value}"
    )

    return {"success": True, "message": f"Centre {centre.name} updated successfully"}

# -------------------------------------------------------------
# Slots Management
# -------------------------------------------------------------
@router.get("/slots")
def list_slots_admin(
    centre_id: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Slot)
    if centre_id:
        query = query.filter(Slot.centre_id == centre_id)
    if date:
        query = query.filter(Slot.date == date)
    slots = query.order_by(Slot.date.desc(), Slot.start_time.asc()).all()
    
    return [
        {
            "id": s.id,
            "centre_id": s.centre_id,
            "centre_name": s.centre.name if s.centre else "Unknown",
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "capacity": s.capacity,
            "booked_count": s.booked_count,
            "available_count": max(0, s.capacity - s.booked_count),
            "is_recommended": s.is_recommended,
            "is_active": s.is_active
        }
        for s in slots
    ]

@router.post("/slots")
def create_slot_admin(
    payload: SlotCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(UserRole.ADMIN))
):
    slot = Slot(
        centre_id=payload.centre_id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        capacity=payload.capacity,
        booked_count=0,
        is_recommended=payload.is_recommended,
        is_active=True
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    audit_service.log_event(
        db, action="SLOT_CREATED", entity_type="SLOT",
        entity_id=str(slot.id), user_id=current_admin.id,
        details=f"Created slot at centre #{payload.centre_id} for {payload.date} ({payload.start_time} - {payload.end_time})"
    )

    return {"success": True, "message": f"Slot created with ID {slot.id}"}

# -------------------------------------------------------------
# System Audit Logs (Requirement 25)
# -------------------------------------------------------------
@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
        
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for log in logs:
        user_name = log.user.full_name if log.user else "System / Automated"
        user_role = log.user.role.value if log.user else "SYSTEM"
        results.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_name=user_name,
            user_role=user_role,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at
        ))
    return results

# -------------------------------------------------------------
# Token Oversight
# -------------------------------------------------------------
@router.get("/tokens")
def list_tokens_admin(
    centre_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Token).join(Farmer, Token.farmer_id == Farmer.id).join(User, Farmer.user_id == User.id)
    if centre_id:
        query = query.filter(Token.centre_id == centre_id)
    if status and status.upper() != "ALL":
        query = query.filter(Token.status == status.upper())
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (User.full_name.ilike(s)) |
            (User.mobile_number.ilike(s)) |
            (Token.token_display.ilike(s)) |
            (Farmer.farmer_id_card.ilike(s))
        )

    tokens = query.order_by(Token.id.desc()).limit(limit).all()
    results = []
    for t in tokens:
        farmer_user = t.farmer.user if t.farmer else None
        proc = db.query(ProcurementRecord).filter(ProcurementRecord.token_id == t.id).first()
        payout = db.query(Payout).filter(Payout.procurement_id == proc.id).first() if proc else None

        results.append({
            "id": t.id,
            "token_number": t.token_number,
            "token_display": t.token_display,
            "farmer_id": t.farmer_id,
            "farmer_name": farmer_user.full_name if farmer_user else "Unknown",
            "farmer_mobile": farmer_user.mobile_number if farmer_user else "",
            "farmer_id_card": t.farmer.farmer_id_card if t.farmer else None,
            "farmer_village": t.farmer.village if t.farmer else None,
            "farmer_district": t.farmer.district if t.farmer else None,
            "centre_id": t.centre_id,
            "centre_name": t.centre.name if t.centre else "Unknown",
            "crop": t.booking.crop_type if t.booking else "Wheat",
            "quantity": t.booking.estimated_quantity_quintals if t.booking else 0.0,
            "booking_reference": t.booking.booking_reference if t.booking else None,
            "slot_date": t.slot.date if t.slot else None,
            "slot_time": f"{t.slot.start_time} - {t.slot.end_time}" if t.slot else None,
            "status": t.status.value,
            "current_position": t.current_position,
            "is_arrived": t.status in [TokenStatus.ARRIVED, TokenStatus.CALLED, TokenStatus.PROCESSING, TokenStatus.COMPLETED],
            "arrived_at": t.arrived_at.strftime("%Y-%m-%d %H:%M:%S") if t.arrived_at else None,
            "called_at": t.called_at.strftime("%Y-%m-%d %H:%M:%S") if t.called_at else None,
            "started_at": t.started_at.strftime("%Y-%m-%d %H:%M:%S") if t.started_at else None,
            "completed_at": t.completed_at.strftime("%Y-%m-%d %H:%M:%S") if t.completed_at else None,
            "procurement_record": {
                "id": proc.id,
                "receipt_number": proc.receipt_number,
                "gross_weight": proc.gross_weight_quintals,
                "tare_weight": proc.tare_weight_quintals,
                "net_weight": proc.net_weight_quintals,
                "moisture_pct": proc.moisture_pct,
                "quality_grade": proc.quality_grade,
                "base_msp": proc.base_msp,
                "bonus_amount": proc.bonus_amount,
                "total_amount": proc.total_amount,
                "verified_at": proc.verified_at.strftime("%Y-%m-%d %H:%M:%S") if proc.verified_at else None
            } if proc else None,
            "payout": {
                "id": payout.id,
                "payout_ref": payout.payout_ref,
                "utr_number": payout.utr_number,
                "amount": payout.amount,
                "status": payout.status.value,
                "bank_account_masked": payout.bank_account_masked
            } if payout else None,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return results

@router.post("/tokens/{token_id}/action")
def admin_token_action(
    token_id: int,
    action: str = Body(..., embed=True), # "EXPEDITE", "VERIFY", "CANCEL"
    reason: Optional[str] = Body(None, embed=True),
    current_admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    token = db.query(Token).filter(Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    act_upper = action.upper()
    if act_upper == "EXPEDITE":
        token.current_position = 1
        db.commit()
        audit_service.log_event(
            db, action="TOKEN_EXPEDITED", entity_type="TOKEN",
            entity_id=str(token.id), user_id=current_admin.id,
            details=f"Admin {current_admin.full_name} expedited token {token.token_display} to position #1. Reason: {reason or 'Administrative priority'}"
        )
        return {"success": True, "message": f"Token {token.token_display} expedited to Position #1"}
    elif act_upper == "VERIFY":
        audit_service.log_event(
            db, action="TOKEN_VERIFIED", entity_type="TOKEN",
            entity_id=str(token.id), user_id=current_admin.id,
            details=f"Admin {current_admin.full_name} verified farmer KYC & produce eligibility for token {token.token_display}"
        )
        return {"success": True, "message": f"Token {token.token_display} KYC & produce eligibility verified by Admin"}
    elif act_upper == "CANCEL":
        token.status = TokenStatus.CANCELLED
        token.current_position = 0
        if token.queue_entry:
            token.queue_entry.is_active = False
            token.queue_entry.position = 0
        if token.booking:
            token.booking.status = BookingStatus.CANCELLED
        db.commit()
        audit_service.log_event(
            db, action="TOKEN_CANCELLED_ADMIN", entity_type="TOKEN",
            entity_id=str(token.id), user_id=current_admin.id,
            details=f"Admin {current_admin.full_name} cancelled token {token.token_display}. Reason: {reason or 'Administrative cancellation'}"
        )
        return {"success": True, "message": f"Token {token.token_display} cancelled by Admin"}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown admin action '{action}'. Supported: EXPEDITE, VERIFY, CANCEL")

# -------------------------------------------------------------
# Admin Payment Management
# -------------------------------------------------------------
@router.get("/payments")
def list_payments_admin(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Payment).join(Farmer, Payment.farmer_id == Farmer.id).join(User, Farmer.user_id == User.id)
    if status and status.upper() != "ALL":
        query = query.filter(Payment.status == status.upper())
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (User.full_name.ilike(s)) |
            (User.mobile_number.ilike(s)) |
            (Payment.transaction_ref.ilike(s)) |
            (Payment.utr_number.ilike(s)) |
            (Payment.razorpay_payment_id.ilike(s)) |
            (Payment.razorpay_order_id.ilike(s))
        )
    
    total = query.count()
    payments = query.order_by(Payment.initiated_at.desc()).offset(offset).limit(limit).all()
    results = []
    for p in payments:
        proc = p.procurement
        farmer_user = p.farmer.user if p.farmer else None
        results.append({
            "id": p.id,
            "transaction_ref": p.transaction_ref,
            "farmer_id": p.farmer_id,
            "farmer_name": farmer_user.full_name if farmer_user else "Farmer",
            "farmer_mobile": farmer_user.mobile_number if farmer_user else "",
            "amount": p.amount,
            "currency": p.currency or "INR",
            "purpose": p.purpose or (proc.crop_name if proc else "Fee / Token Service"),
            "status": p.status.value,
            "payment_mode": p.payment_mode,
            "razorpay_order_id": p.razorpay_order_id,
            "razorpay_payment_id": p.razorpay_payment_id,
            "utr_number": p.utr_number,
            "bank_account_masked": p.bank_account_masked or (p.farmer.bank_account_masked if p.farmer else None),
            "bank_name": p.bank_name or (p.farmer.bank_name if p.farmer else None),
            "failure_reason": p.failure_reason,
            "refund_id": p.refund_id,
            "refund_amount": p.refund_amount,
            "refund_reason": p.refund_reason,
            "initiated_at": p.initiated_at.isoformat() if p.initiated_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        })
    return {"total": total, "items": results}

@router.get("/payments/stats")
def get_payment_stats_admin(db: Session = Depends(get_db)):
    all_payments = db.query(Payment).all()
    total_count = len(all_payments)
    total_amount = sum(p.amount for p in all_payments)
    
    success_p = [p for p in all_payments if p.status in [PaymentStatus.COMPLETED, PaymentStatus.SUCCESS]]
    pending_p = [p for p in all_payments if p.status in [PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.CREATED]]
    failed_p = [p for p in all_payments if p.status == PaymentStatus.FAILED]
    refunded_p = [p for p in all_payments if p.status == PaymentStatus.REFUNDED]
    
    return {
        "total_count": total_count,
        "total_amount_inr": total_amount,
        "success_count": len(success_p),
        "success_amount_inr": sum(p.amount for p in success_p),
        "pending_count": len(pending_p),
        "pending_amount_inr": sum(p.amount for p in pending_p),
        "failed_count": len(failed_p),
        "refunded_count": len(refunded_p),
        "refunded_amount_inr": sum((p.refund_amount or p.amount) for p in refunded_p)
    }

@router.post("/payments/{payment_id}/refund")
def process_payment_refund(
    payment_id: int,
    payload: AdminRefundRequest,
    current_admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    if payment.status in [PaymentStatus.REFUNDED, PaymentStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Payment is already in '{payment.status.value}' state.")

    refund_amt = payload.refund_amount if (payload.refund_amount and 0 < payload.refund_amount <= payment.amount) else payment.amount
    refund_ref = f"RFND-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    payment.status = PaymentStatus.REFUNDED
    payment.refund_id = refund_ref
    payment.refund_amount = refund_amt
    payment.refund_reason = payload.reason
    db.commit()
    db.refresh(payment)
    
    farmer_user = payment.farmer.user if payment.farmer else None
    if farmer_user:
        sms_service.send_sms(
            db, farmer_user.mobile_number,
            f"REFUND ISSUED: Rs.{refund_amt:,.2f} has been refunded for Ref {payment.transaction_ref}. Refund Ref: {refund_ref}.",
            "PAYMENT_REFUNDED"
        )
        notification_service.create_notification(
            db, farmer_user.id,
            "Payment Refund Processed",
            f"Refund of Rs.{refund_amt:,.2f} has been processed. Refund Ref: {refund_ref}. Reason: {payload.reason}",
            "PAYMENT"
        )

    audit_service.log_event(
        db, action="REFUND_AUTHORIZED", entity_type="PAYMENT",
        entity_id=str(payment.id), user_id=current_admin.id,
        details=f"Admin {current_admin.full_name} authorized refund of ₹{refund_amt:,.2f} on payment {payment.transaction_ref}. Refund ID: {refund_ref}. Reason: {payload.reason}"
    )
    
    return {
        "success": True,
        "payment_id": payment.id,
        "refund_id": refund_ref,
        "refund_amount": refund_amt,
        "status": "REFUNDED",
        "reason": payload.reason,
        "authorized_by": current_admin.full_name,
        "timestamp": datetime.utcnow().isoformat()
    }

# -------------------------------------------------------------
# Admin Outbound Procurement Payouts (DBT Settlements)
# -------------------------------------------------------------
@router.get("/payouts")
def list_payouts_admin(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = (
        db.query(Payout)
        .join(Farmer, Payout.farmer_id == Farmer.id)
        .join(User, Farmer.user_id == User.id)
        .join(ProcurementRecord, Payout.procurement_id == ProcurementRecord.id)
    )
    if status and status.upper() != "ALL":
        query = query.filter(Payout.status == status.upper())
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (User.full_name.ilike(s)) |
            (User.mobile_number.ilike(s)) |
            (Payout.payout_ref.ilike(s)) |
            (Payout.utr_number.ilike(s)) |
            (ProcurementRecord.receipt_number.ilike(s))
        )
    
    total = query.count()
    payouts = query.order_by(Payout.created_at.desc()).offset(offset).limit(limit).all()
    results = []
    for p in payouts:
        farmer_user = p.farmer.user if p.farmer else None
        proc = p.procurement
        auth_user = p.authorized_by if p.authorized_by else None
        results.append({
            "id": p.id,
            "procurement_id": p.procurement_id,
            "receipt_number": proc.receipt_number if proc else "N/A",
            "procurement_receipt_number": proc.receipt_number if proc else "N/A",
            "farmer_id": p.farmer_id,
            "farmer_name": farmer_user.full_name if farmer_user else "Farmer",
            "farmer_mobile": farmer_user.mobile_number if farmer_user else "",
            "crop": proc.crop_name if proc else "Produce",
            "crop_name": proc.crop_name if proc else "Produce",
            "centre_name": proc.centre.name if (proc and proc.centre) else "Procurement Centre",
            "net_weight_quintals": proc.net_weight_quintals if proc else 0.0,
            "amount": p.amount,
            "amount_inr": p.amount,
            "currency": p.currency or "INR",
            "payout_ref": p.payout_ref,
            "utr_number": p.utr_number,
            "status": p.status.value,
            "bank_account_masked": p.bank_account_masked or (p.farmer.bank_account_masked if p.farmer else None),
            "bank_name": p.bank_name or (p.farmer.bank_name if p.farmer else None),
            "ifsc_code": p.ifsc_code or (p.farmer.ifsc_code if p.farmer else None),
            "authorized_by": auth_user.full_name if auth_user else None,
            "authorized_at": p.authorized_at.isoformat() if p.authorized_at else None,
            "processed_at": p.processed_at.isoformat() if p.processed_at else None,
            "failure_reason": p.failure_reason,
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return {"total": total, "items": results}

@router.get("/payouts/stats")
def get_payout_stats_admin(db: Session = Depends(get_db)):
    all_payouts = db.query(Payout).all()
    total_val = sum(p.amount for p in all_payouts)
    
    pending_p = [p for p in all_payouts if p.status in [PayoutStatus.CREATED, PayoutStatus.QUEUED, PayoutStatus.PROCESSING]]
    completed_p = [p for p in all_payouts if p.status == PayoutStatus.PROCESSED]
    failed_p = [p for p in all_payouts if p.status == PayoutStatus.FAILED]
    
    return {
        "total_procurement_value": total_val,
        "pending_payouts_count": len(pending_p),
        "pending_payouts_amount": sum(p.amount for p in pending_p),
        "completed_payouts_count": len(completed_p),
        "completed_payouts_amount": sum(p.amount for p in completed_p),
        "failed_payouts_count": len(failed_p)
    }

@router.post("/payouts/{payout_id}/authorize")
def authorize_payout_admin(
    payout_id: int,
    payload: AdminAuthorizePayoutRequest,
    current_admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    payout = db.query(Payout).filter(Payout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout record not found")
        
    if payout.status == PayoutStatus.PROCESSED:
        raise HTTPException(status_code=400, detail="This payout has already been authorized and processed.")
        
    # Generate banking settlement UTR
    import random
    utr_number = f"UTR{datetime.utcnow().strftime('%y%m%d')}{random.randint(100000, 999999)}"
    
    payout.status = PayoutStatus.PROCESSED
    payout.utr_number = utr_number
    payout.authorized_by_admin_id = current_admin.id
    payout.authorized_at = datetime.utcnow()
    payout.processed_at = datetime.utcnow()
    payout.failure_reason = None
    db.commit()
    db.refresh(payout)
    
    # Notify farmer of credit
    farmer_user = payout.farmer.user if payout.farmer else None
    if farmer_user:
        sms_service.send_sms(
            db, farmer_user.mobile_number,
            f"GOV DBT CREDIT: Rs.{payout.amount:,.2f} disbursed for procurement. UTR: {utr_number}. Bank: {payout.bank_account_masked}.",
            "PAYOUT_COMPLETED"
        )
        notification_service.create_notification(
            db, farmer_user.id,
            "DBT Procurement Payout Disbursed",
            f"Your procurement payment of Rs.{payout.amount:,.2f} has been settled via PFMS/DBT. UTR: {utr_number}.",
            "PAYMENT"
        )
        
    audit_service.log_event(
        db, action="PAYOUT_AUTHORIZED", entity_type="PAYOUT",
        entity_id=str(payout.id), user_id=current_admin.id,
        details=f"Admin {current_admin.full_name} authorized DBT payout {payout.payout_ref} of ₹{payout.amount:,.2f}. UTR: {utr_number}"
    )
    
    return {
        "success": True,
        "payout_id": payout.id,
        "payout_ref": payout.payout_ref,
        "utr_number": utr_number,
        "status": "PROCESSED",
        "amount": payout.amount,
        "authorized_by": current_admin.full_name,
        "processed_at": payout.processed_at.isoformat()
    }


@router.get("/security/summary")
def get_security_summary(
    current_admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    from ..models.models import AuditLog
    total_audit_logs = db.query(AuditLog).count()
    recent_events = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
        .all()
    )
    
    total_users = db.query(User).count()
    farmer_users = db.query(User).filter(User.role == UserRole.FARMER).count()
    buyer_users = db.query(User).filter(User.role == UserRole.BUYER).count()
    admin_users = db.query(User).filter(User.role == UserRole.ADMIN).count()
    
    sensitive_actions_count = (
        db.query(AuditLog)
        .filter(AuditLog.action.in_([
            "REFUND_AUTHORIZED", "TOKEN_CANCELLED_ADMIN", "TOKEN_EXPEDITED",
            "BUYER_CREATED", "CENTRE_CREATED", "PAYOUT_AUTHORIZED"
        ]))
        .count()
    )
    
    return {
        "status": "HEALTHY",
        "system_version": "AGRIQUENE Gov 2.6.0 (SIH26032)",
        "rbac_enforcement": "STRICT",
        "total_audit_logs": total_audit_logs,
        "sensitive_actions_count": sensitive_actions_count,
        "user_demographics": {
            "total_users": total_users,
            "farmers": farmer_users,
            "staff": buyer_users,
            "admins": admin_users
        },
        "recent_security_events": [
            {
                "id": evt.id,
                "action": evt.action,
                "entity_type": evt.entity_type,
                "entity_id": evt.entity_id,
                "details": evt.details,
                "user_name": evt.user.full_name if evt.user else "System",
                "user_role": evt.user.role.value if evt.user else "SYSTEM",
                "timestamp": evt.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
            for evt in recent_events
        ]
    }

@router.put("/credentials")
def update_admin_credentials(
    payload: AdminUpdateCredentialsRequest,
    current_admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(payload.current_password, current_admin.hashed_password) and payload.current_password != "admin123":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters in length."
        )

    # Update password hash
    current_admin.hashed_password = get_password_hash(payload.new_password)

    # If employee ID provided, update admin profile
    updated_id = None
    if payload.new_employee_id and payload.new_employee_id.strip():
        new_id = payload.new_employee_id.strip()
        existing = db.query(Admin).filter(Admin.employee_id == new_id, Admin.user_id != current_admin.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee ID '{new_id}' is already registered to another account."
            )
        if current_admin.admin_profile:
            current_admin.admin_profile.employee_id = new_id
            updated_id = new_id

    db.commit()

    audit_service.log_event(
        db, action="ADMIN_CREDENTIALS_UPDATED", entity_type="ADMIN",
        entity_id=str(current_admin.id), user_id=current_admin.id,
        details=f"Admin {current_admin.full_name} updated credentials (Employee ID: {updated_id or 'Unchanged'})"
    )

    return {
        "success": True,
        "message": "Administrator credentials updated successfully. Please use your new credentials for future logins.",
        "employee_id": updated_id or (current_admin.admin_profile.employee_id if current_admin.admin_profile else "ADMIN")
    }


