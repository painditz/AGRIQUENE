from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
from ..db.session import get_db
from ..models.models import (
    User, Farmer, Booking, Token, Slot, ProcurementCentre,
    BookingStatus, TokenStatus, QueueEntry
)
from ..schemas.schemas import BookingCreateRequest, TokenResponse
from .farmers import get_current_farmer_user
from ..services.eta_service import eta_service
from ..services.sms_service import sms_service
from ..services.notification_service import notification_service
from ..services.audit_service import audit_service
from ..core.websocket import manager

router = APIRouter(prefix="/bookings", tags=["Slot Booking & Tokens"])

@router.post("", response_model=TokenResponse)
async def create_booking(
    payload: BookingCreateRequest,
    user: User = Depends(get_current_farmer_user),
    db: Session = Depends(get_db)
):
    farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not farmer:
        raise HTTPException(status_code=400, detail="Please complete farmer profile registration first.")
        
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == payload.centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Procurement Centre not found")
        
    slot = db.query(Slot).filter(Slot.id == payload.slot_id, Slot.centre_id == centre.id).first()
    if not slot or not slot.is_active:
        raise HTTPException(status_code=404, detail="Selected slot is invalid or unavailable")
        
    if slot.booked_count >= slot.capacity:
        raise HTTPException(status_code=400, detail="This time slot is full. Please choose another slot.")

    # Generate next sequential token number for this centre today
    latest_token = (
        db.query(Token)
        .filter(Token.centre_id == centre.id)
        .order_by(Token.token_number.desc())
        .first()
    )
    next_token_num = (latest_token.token_number + 1) if latest_token else 101
    
    # Calculate initial queue position based on waiting count
    waiting_count = (
        db.query(Token)
        .filter(Token.centre_id == centre.id, Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED]))
        .count()
    )
    position = waiting_count + 1

    booking_ref = f"AGQ-2026-{centre.code.split('-')[-2]}-{next_token_num}"
    
    # Create booking record
    booking = Booking(
        booking_reference=booking_ref,
        farmer_id=farmer.id,
        centre_id=centre.id,
        slot_id=slot.id,
        crop_type=payload.crop_type,
        estimated_quantity_quintals=payload.estimated_quantity_quintals,
        season=payload.season,
        status=BookingStatus.CONFIRMED,
        booking_date=slot.date
    )
    db.add(booking)
    db.flush()

    # Create Token record
    token_display = f"#{next_token_num}"
    token_obj = Token(
        token_number=next_token_num,
        token_display=token_display,
        booking_id=booking.id,
        farmer_id=farmer.id,
        centre_id=centre.id,
        slot_id=slot.id,
        status=TokenStatus.WAITING,
        current_position=position,
        initial_position=position
    )
    db.add(token_obj)
    db.flush()

    # Create Queue Entry
    queue_entry = QueueEntry(
        centre_id=centre.id,
        token_id=token_obj.id,
        position=position,
        is_active=True
    )
    db.add(queue_entry)

    # Increment slot booked count
    slot.booked_count += 1
    db.commit()
    db.refresh(token_obj)
    db.refresh(booking)

    # Calculate real-time ETA
    eta_data = eta_service.calculate_eta(
        token_id=token_obj.id,
        token_number=token_obj.token_number,
        position=position,
        queue_length=waiting_count + 1,
        centre_id=centre.id,
        active_counters=centre.active_counters,
        avg_processing_time=centre.avg_processing_time_min,
        crop_type=payload.crop_type,
        quantity_quintals=payload.estimated_quantity_quintals,
        workload_pct=centre.workload_pct
    )

    # Dispatch SMS & In-app Notification
    sms_service.notify_token_generated(
        db, user.mobile_number,
        token_display, centre.name,
        eta_data["predicted_wait_minutes"],
        eta_data["expected_turn_time"]
    )
    
    notification_service.create_notification(
        db, user.id,
        "Procurement Slot Booked",
        f"Token {token_display} booked at {centre.name} for {slot.date} ({slot.start_time}). Position: {position}.",
        "BOOKING"
    )

    # Broadcast new queue entry via WebSockets
    await manager.broadcast_to_centre(str(centre.id), {
        "type": "NEW_BOOKING",
        "centre_id": centre.id,
        "token_number": next_token_num,
        "token_display": token_display,
        "position": position,
        "timestamp": datetime.now().isoformat()
    })

    audit_service.log_event(
        db, action="BOOKING_CREATED", entity_type="BOOKING",
        entity_id=str(booking.id), user_id=user.id,
        details=f"Farmer {user.full_name} booked slot for {slot.date} ({slot.start_time}) at {centre.name} -> Token {token_display}"
    )

    slot_time = f"{slot.start_time} - {slot.end_time}"
    return TokenResponse(
        id=token_obj.id,
        token_number=token_obj.token_number,
        token_display=token_obj.token_display,
        booking_id=booking.id,
        booking_reference=booking.booking_reference,
        farmer_id=farmer.id,
        farmer_name=user.full_name,
        farmer_mobile=user.mobile_number,
        farmer_district=farmer.district,
        centre_id=centre.id,
        centre_name=centre.name,
        slot_id=slot.id,
        slot_time=slot_time,
        booking_date=booking.booking_date,
        crop_type=booking.crop_type,
        quantity_quintals=booking.estimated_quantity_quintals,
        status=token_obj.status,
        current_position=position,
        initial_position=position,
        predicted_wait_minutes=eta_data["predicted_wait_minutes"],
        expected_turn_time=eta_data["expected_turn_time"],
        recommended_departure_time=eta_data["recommended_departure_time"],
        departure_advice=eta_data["departure_advice"],
        active_counters=centre.active_counters,
        created_at=token_obj.created_at
    )
