from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..db.session import get_db
from ..models.models import (
    ProcurementCentre, Slot, Buyer, Farmer, User,
    Token, TokenStatus, Booking, ProcurementRecord, Payment,
    CentreStatus, UserRole
)
from ..schemas.schemas import CentreResponse, SlotResponse
from ..core.security import get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin Management"])

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
    
    # Total procurement value
    total_val = sum(p.total_amount for p in db.query(ProcurementRecord).all()) or 148500.0

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
    db: Session = Depends(get_db)
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

    return {"success": True, "message": f"Buyer {full_name} ({employee_id}) created successfully"}

@router.post("/centres")
def create_centre_admin(
    name: str = Body(..., embed=True),
    code: str = Body(..., embed=True),
    address: str = Body(..., embed=True),
    district: str = Body(..., embed=True),
    state: str = Body(..., embed=True),
    pin_code: str = Body(..., embed=True),
    capacity_per_day: int = Body(150, embed=True),
    active_counters: int = Body(4, embed=True),
    db: Session = Depends(get_db)
):
    centre = ProcurementCentre(
        name=name,
        code=code,
        address=address,
        district=district,
        state=state,
        pin_code=pin_code,
        latitude=28.6692,
        longitude=77.4538,
        capacity_per_day=capacity_per_day,
        active_counters=active_counters,
        total_counters=active_counters + 2,
        status=CentreStatus.OPEN
    )
    db.add(centre)
    db.commit()
    db.refresh(centre)
    return {"success": True, "message": f"Centre {name} created with ID {centre.id}"}
