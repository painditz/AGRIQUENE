from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..db.session import get_db
from ..models.models import (
    ProcurementCentre, Slot, Buyer, Farmer, User,
    Token, TokenStatus, Booking, ProcurementRecord, Payment,
    CentreStatus, UserRole, AuditLog
)
from ..schemas.schemas import (
    CentreResponse, SlotResponse, AuditLogResponse,
    CentreCreateRequest, CentreUpdateRequest, SlotCreateRequest
)
from ..core.security import get_password_hash, require_role
from ..services.audit_service import audit_service

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
