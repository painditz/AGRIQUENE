from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, Optional
from ..db.session import get_db
from ..models.models import (
    Buyer, ProcurementCentre, Token, TokenStatus,
    Booking, ProcurementRecord, User, UserRole
)
from ..core.websocket import manager
from ..core.security import require_role, get_current_user
from ..services.audit_service import audit_service

router = APIRouter(
    prefix="/buyers",
    tags=["Buyer Dashboard"],
    dependencies=[Depends(require_role(UserRole.MANDI_OFFICER, UserRole.BUYER, UserRole.ADMIN))]
)

@router.get("/dashboard")
def get_buyer_dashboard(
    centre_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if centre_id is None:
        if current_user.buyer_profile and current_user.buyer_profile.centre_id:
            centre_id = current_user.buyer_profile.centre_id
        else:
            first_c = db.query(ProcurementCentre).first()
            centre_id = first_c.id if first_c else 1

    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
        
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    total_bookings = (
        db.query(Booking)
        .filter(Booking.centre_id == centre_id, Booking.booking_date == today_str)
        .count()
    )
    if total_bookings == 0:
        total_bookings = db.query(Booking).filter(Booking.centre_id == centre_id).count()

    waiting_count = (
        db.query(Token)
        .filter(Token.centre_id == centre_id, Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED]))
        .count()
    )

    completed_count = (
        db.query(Token)
        .filter(Token.centre_id == centre_id, Token.status == TokenStatus.COMPLETED)
        .count()
    )

    processing_count = (
        db.query(Token)
        .filter(Token.centre_id == centre_id, Token.status.in_([TokenStatus.PROCESSING, TokenStatus.CALLED]))
        .count()
    )

    current_serving = (
        db.query(Token)
        .filter(Token.centre_id == centre_id, Token.status.in_([TokenStatus.PROCESSING, TokenStatus.CALLED]))
        .order_by(Token.called_at.desc(), Token.started_at.desc(), Token.id.desc())
        .first()
    )

    return {
        "centre_id": centre.id,
        "centre_name": centre.name,
        "centre_code": centre.code,
        "district": centre.district,
        "state": centre.state,
        "active_counters": centre.active_counters,
        "total_counters": centre.total_counters,
        "today_stats": {
            "total_bookings": total_bookings,
            "waiting_farmers": waiting_count,
            "completed_procurements": completed_count,
            "currently_processing": processing_count,
            "active_counters": centre.active_counters,
            "avg_processing_time_min": centre.avg_processing_time_min,
            "workload_pct": centre.workload_pct
        },
        "current_serving": {
            "token_id": current_serving.id if current_serving else None,
            "token_display": current_serving.token_display if current_serving else "None",
            "farmer_name": current_serving.farmer.user.full_name if current_serving and current_serving.farmer else "None",
            "crop": current_serving.booking.crop_type if current_serving and current_serving.booking else "Wheat",
            "quantity": current_serving.booking.estimated_quantity_quintals if current_serving and current_serving.booking else 0.0
        } if current_serving else None
    }

@router.put("/counters")
async def update_active_counters(
    centre_id: int = Body(..., embed=True),
    active_counters: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANDI_OFFICER, UserRole.BUYER, UserRole.ADMIN))
):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
        
    centre.active_counters = max(1, min(centre.total_counters, active_counters))
    db.commit()

    audit_service.log_event(
        db, action="COUNTER_UPDATED", entity_type="CENTRE",
        entity_id=str(centre.id), user_id=current_user.id,
        details=f"User {current_user.full_name} updated active counters to {centre.active_counters} at {centre.name}"
    )

    # Broadcast updated counters to all listening screens
    await manager.broadcast_to_centre(str(centre.id), {
        "type": "COUNTERS_UPDATED",
        "centre_id": centre.id,
        "active_counters": centre.active_counters,
        "timestamp": datetime.now().isoformat()
    })

    return {
        "success": True,
        "message": f"Active counters updated to {centre.active_counters} for {centre.name}",
        "active_counters": centre.active_counters
    }
