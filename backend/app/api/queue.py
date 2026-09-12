from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from ..db.session import get_db
from ..models.models import (
    ProcurementCentre, Token, TokenStatus, QueueEntry,
    Farmer, User, Booking
)
from ..schemas.schemas import CentreQueueStatusResponse, QueueItem, QueueCallRequest
from ..services.eta_service import eta_service
from ..services.sms_service import sms_service
from ..services.notification_service import notification_service
from ..core.websocket import manager

router = APIRouter(prefix="/queue", tags=["Queue Management"])

@router.get("/{centre_id}", response_model=CentreQueueStatusResponse)
def get_centre_queue(centre_id: int, db: Session = Depends(get_db)):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
        
    # Get active tokens (PROCESSING, CALLED, ARRIVED, WAITING)
    tokens = (
        db.query(Token)
        .filter(
            Token.centre_id == centre_id,
            Token.status.in_([TokenStatus.PROCESSING, TokenStatus.CALLED, TokenStatus.ARRIVED, TokenStatus.WAITING])
        )
        .order_by(Token.current_position.asc(), Token.id.asc())
        .all()
    )
    
    # Identify currently serving token
    serving_token = next((t for t in tokens if t.status in [TokenStatus.PROCESSING, TokenStatus.CALLED]), None)
    
    # Total completed today
    completed_today = (
        db.query(Token)
        .filter(Token.centre_id == centre_id, Token.status == TokenStatus.COMPLETED)
        .count()
    )
    
    waiting_tokens = [t for t in tokens if t.status in [TokenStatus.WAITING, TokenStatus.ARRIVED]]
    
    queue_items = []
    for t in tokens:
        farmer_user = t.farmer.user if t.farmer else None
        farmer_name = farmer_user.full_name if farmer_user else "Farmer"
        mobile_masked = f"{farmer_user.mobile_number[:2]}******{farmer_user.mobile_number[-2:]}" if farmer_user else "98******10"
        
        # Calculate ETA
        eta_data = eta_service.calculate_eta(
            token_id=t.id,
            token_number=t.token_number,
            position=t.current_position,
            queue_length=len(waiting_tokens),
            centre_id=centre.id,
            active_counters=centre.active_counters,
            avg_processing_time=centre.avg_processing_time_min,
            crop_type=t.booking.crop_type if t.booking else "Wheat",
            quantity_quintals=t.booking.estimated_quantity_quintals if t.booking else 35.0,
            workload_pct=centre.workload_pct
        )
        
        slot_time = f"{t.slot.start_time}" if t.slot else "11:00 AM"
        counter = t.queue_entry.counter_assigned if t.queue_entry else (1 if t.status in [TokenStatus.CALLED, TokenStatus.PROCESSING] else None)
        
        queue_items.append(QueueItem(
            token_id=t.id,
            token_number=t.token_number,
            token_display=t.token_display,
            farmer_name=farmer_name,
            farmer_mobile_masked=mobile_masked,
            crop=t.booking.crop_type if t.booking else "Wheat",
            quantity_quintals=t.booking.estimated_quantity_quintals if t.booking else 35.0,
            slot_time=slot_time,
            status=t.status,
            position=t.current_position,
            estimated_wait_min=eta_data["predicted_wait_minutes"],
            expected_turn_time=eta_data["expected_turn_time"],
            counter_assigned=counter
        ))
        
    return CentreQueueStatusResponse(
        centre_id=centre.id,
        centre_name=centre.name,
        active_counters=centre.active_counters,
        total_waiting=len(waiting_tokens),
        total_completed_today=completed_today,
        current_serving_token=serving_token.token_display if serving_token else None,
        current_serving_id=serving_token.id if serving_token else None,
        avg_processing_time_min=centre.avg_processing_time_min,
        queue=queue_items,
        updated_at=datetime.now().strftime("%I:%M:%S %p")
    )

@router.post("/call-next")
async def call_next_token(payload: QueueCallRequest, centre_id: Optional[int] = 1, db: Session = Depends(get_db)):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
        
    # If a specific token_id was requested
    if payload.token_id:
        target_token = db.query(Token).filter(Token.id == payload.token_id, Token.centre_id == centre_id).first()
    else:
        # Find next waiting or arrived token with lowest position
        target_token = (
            db.query(Token)
            .filter(
                Token.centre_id == centre_id,
                Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED])
            )
            .order_by(Token.current_position.asc(), Token.id.asc())
            .first()
        )
        
    if not target_token:
        raise HTTPException(status_code=400, detail="No waiting tokens found in queue for this centre.")
        
    # Mark any previously processing token at this counter as completed
    prev_active = (
        db.query(Token)
        .filter(
            Token.centre_id == centre_id,
            Token.status == TokenStatus.CALLED
        )
        .all()
    )
    for p in prev_active:
        p.status = TokenStatus.PROCESSING
        
    # Update target token to CALLED
    target_token.status = TokenStatus.CALLED
    target_token.called_at = datetime.utcnow()
    target_token.current_position = 0
    
    if target_token.queue_entry:
        target_token.queue_entry.counter_assigned = payload.counter_number
        target_token.queue_entry.position = 0
        
    # Advance queue: Decrement position for all remaining waiting tokens
    remaining_waiting = (
        db.query(Token)
        .filter(
            Token.centre_id == centre_id,
            Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED]),
            Token.id != target_token.id
        )
        .order_by(Token.current_position.asc())
        .all()
    )
    
    for idx, t in enumerate(remaining_waiting):
        new_pos = idx + 1
        t.current_position = new_pos
        if t.queue_entry:
            t.queue_entry.position = new_pos

    db.commit()

    # Dispatch SMS & Notifications for Called Farmer
    called_farmer_user = target_token.farmer.user if target_token.farmer else None
    if called_farmer_user:
        sms_service.notify_token_called(
            db, called_farmer_user.mobile_number,
            target_token.token_display, payload.counter_number
        )
        notification_service.create_notification(
            db, called_farmer_user.id,
            "Your Token Has Been Called!",
            f"Please proceed immediately to Counter #{payload.counter_number} with your produce.",
            "TOKEN_CALLED"
        )

    # Check farmers who are now in top 3 positions to send turn approaching notices
    for t in remaining_waiting[:3]:
        f_user = t.farmer.user if t.farmer else None
        if f_user:
            eta_info = eta_service.calculate_eta(
                token_id=t.id, token_number=t.token_number, position=t.current_position,
                queue_length=len(remaining_waiting), centre_id=centre.id,
                active_counters=centre.active_counters, avg_processing_time=centre.avg_processing_time_min
            )
            sms_service.notify_turn_approaching(
                db, f_user.mobile_number, t.token_display, centre.name, eta_info["predicted_wait_minutes"]
            )
            notification_service.create_notification(
                db, f_user.id,
                "Your Turn is Approaching",
                f"You are now position #{t.current_position}. Estimated waiting time: {eta_info['predicted_wait_minutes']} minutes.",
                "QUEUE_UPDATE"
            )

    # Broadcast real-time event to all connected clients via WebSocket
    await manager.broadcast_to_centre(str(centre.id), {
        "type": "TOKEN_CALLED",
        "centre_id": centre.id,
        "token_id": target_token.id,
        "token_number": target_token.token_number,
        "token_display": target_token.token_display,
        "counter_number": payload.counter_number,
        "timestamp": datetime.now().isoformat(),
        "total_waiting": len(remaining_waiting)
    })

    return {
        "success": True,
        "message": f"Token {target_token.token_display} called at Counter #{payload.counter_number}",
        "called_token": target_token.token_display,
        "counter": payload.counter_number,
        "remaining_waiting": len(remaining_waiting)
    }

@router.post("/{token_id}/arrived")
async def mark_farmer_arrived(token_id: int, db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    token.status = TokenStatus.ARRIVED
    token.arrived_at = datetime.utcnow()
    db.commit()

    f_user = token.farmer.user if token.farmer else None
    if f_user:
        notification_service.create_notification(
            db, f_user.id,
            "Arrival Confirmed",
            f"Your arrival at {token.centre.name} has been verified at the entry gate.",
            "ARRIVAL"
        )

    await manager.broadcast_to_centre(str(token.centre_id), {
        "type": "FARMER_ARRIVED",
        "centre_id": token.centre_id,
        "token_id": token.id,
        "token_display": token.token_display,
        "timestamp": datetime.now().isoformat()
    })

    return {"success": True, "message": f"Token {token.token_display} marked as arrived at centre gate."}

@router.post("/{token_id}/processing")
async def start_token_processing(token_id: int, db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    token.status = TokenStatus.PROCESSING
    token.started_at = datetime.utcnow()
    db.commit()

    await manager.broadcast_to_centre(str(token.centre_id), {
        "type": "TOKEN_PROCESSING",
        "centre_id": token.centre_id,
        "token_id": token.id,
        "token_display": token.token_display,
        "timestamp": datetime.now().isoformat()
    })

    return {"success": True, "message": f"Token {token.token_display} is now being processed on weighbridge."}

@router.post("/{token_id}/skip")
async def skip_token(token_id: int, db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    token.status = TokenStatus.SKIPPED
    db.commit()

    await manager.broadcast_to_centre(str(token.centre_id), {
        "type": "TOKEN_SKIPPED",
        "centre_id": token.centre_id,
        "token_id": token.id,
        "token_display": token.token_display,
        "timestamp": datetime.now().isoformat()
    })

    return {"success": True, "message": f"Token {token.token_display} skipped / marked absent."}
