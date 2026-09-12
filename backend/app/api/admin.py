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
    AdminPayoutStatsResponse
)
from ..core.security import get_password_hash, require_role
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
    if status:
        query = query.filter(Token.status == status)
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.mobile_number.ilike(f"%{search}%")) |
            (Token.token_display.ilike(f"%{search}%"))
        )

    tokens = query.order_by(Token.id.desc()).limit(limit).all()
    results = []
    for t in tokens:
        results.append({
            "id": t.id,
            "token_number": t.token_number,
            "token_display": t.token_display,
            "farmer_name": t.farmer.user.full_name if t.farmer else "Unknown",
            "farmer_mobile": t.farmer.user.mobile_number if t.farmer else "",
            "centre_id": t.centre_id,
            "centre_name": t.centre.name if t.centre else "Unknown",
            "status": t.status.value,
            "current_position": t.current_position,
            "crop": t.booking.crop_type if t.booking else "Wheat",
            "quantity": t.booking.estimated_quantity_quintals if t.booking else 0.0,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return results

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
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    if payment.status == PaymentStatus.REFUNDED:
        raise HTTPException(status_code=400, detail="Payment has already been refunded.")

    ref_id = f"ref_agq_{uuid.uuid4().hex[:12]}"
    refund_amt = payload.refund_amount or payment.amount
    
    payment.status = PaymentStatus.REFUNDED
    payment.refund_id = ref_id
    payment.refund_amount = refund_amt
    payment.refund_reason = payload.reason
    db.commit()
    db.refresh(payment)
    
    audit_service.log_event(
        db, action="PAYMENT_REFUNDED", entity_type="PAYMENT",
        entity_id=str(payment.id),
        details=f"Payment {payment.transaction_ref} refunded (Amount: ₹{refund_amt:,.2f}, Reason: {payload.reason})"
    )
    
    return {
        "success": True,
        "payment_id": payment.id,
        "refund_id": ref_id,
        "refund_amount": refund_amt,
        "status": "REFUNDED",
        "reason": payload.reason
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

