from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from ..db.session import get_db
from ..models.models import (
    ProcurementCentre, Token, TokenStatus, QueueEntry,
    Farmer, User, Booking, UserRole
)
from ..schemas.schemas import CentreQueueStatusResponse, QueueItem, QueueCallRequest
from ..core.security import require_role
from ..services.eta_service import eta_service
from ..services.sms_service import sms_service
from ..services.notification_service import notification_service
from ..services.audit_service import audit_service
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
    
    # Identify currently serving token: pick the most recent CALLED or PROCESSING token
    active_served = [t for t in tokens if t.status in [TokenStatus.CALLED, TokenStatus.PROCESSING]]
    serving_token = None
    if active_served:
        serving_token = max(
            active_served,
            key=lambda t: t.called_at or t.started_at or t.created_at or datetime.min
        )
    
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
        
        slot_date = t.slot.date if t.slot else None
        slot_time = f"{t.slot.start_time}" if t.slot else "11:00 AM"
        counter = t.queue_entry.counter_assigned if t.queue_entry else (1 if t.status in [TokenStatus.CALLED, TokenStatus.PROCESSING] else None)
        
        queue_items.append(QueueItem(
            token_id=t.id,
            token_number=t.token_number,
            token_display=t.token_display,
            farmer_name=farmer_name,
            farmer_mobile_masked=mobile_masked,
            farmer_id=t.farmer_id,
            farmer_id_card=t.farmer.farmer_id_card if t.farmer else None,
            farmer_village=t.farmer.village if t.farmer else None,
            farmer_district=t.farmer.district if t.farmer else None,
            crop=t.booking.crop_type if t.booking else "Wheat",
            quantity_quintals=t.booking.estimated_quantity_quintals if t.booking else 35.0,
            slot_date=slot_date,
            slot_time=slot_time,
            booking_reference=t.booking.booking_reference if t.booking else None,
            status=t.status,
            position=t.current_position,
            estimated_wait_min=eta_data["predicted_wait_minutes"],
            expected_turn_time=eta_data["expected_turn_time"],
            counter_assigned=counter,
            arrived_at=t.arrived_at,
            called_at=t.called_at,
            started_at=t.started_at
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
async def call_next_token(
    payload: QueueCallRequest,
    centre_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.BUYER, UserRole.ADMIN))
):
    # If token_id specified, resolve centre from token
    if payload.token_id:
        target_token = db.query(Token).filter(Token.id == payload.token_id).first()
        if target_token:
            centre_id = target_token.centre_id

    effective_centre_id = centre_id or 1
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == effective_centre_id).first()
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
        
    # Mark any previously active token at this counter as completed
    prev_active = (
        db.query(Token)
        .filter(
            Token.centre_id == centre_id,
            Token.status.in_([TokenStatus.CALLED, TokenStatus.PROCESSING]),
            Token.id != target_token.id
        )
        .all()
    )
    for p in prev_active:
        # If assigned to this counter or counter unassigned
        p_counter = p.queue_entry.counter_assigned if p.queue_entry else 1
        if p_counter == payload.counter_number:
            p.status = TokenStatus.COMPLETED
            p.completed_at = datetime.utcnow()
            p.current_position = 0
            if p.queue_entry:
                p.queue_entry.is_active = False
                p.queue_entry.position = 0
        
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

    audit_service.log_event(
        db, action="TOKEN_CALLED", entity_type="TOKEN",
        entity_id=str(target_token.id),
        details=f"Token {target_token.token_display} called to Counter #{payload.counter_number} at {centre.name}"
    )

    return {
        "success": True,
        "message": f"Token {target_token.token_display} called at Counter #{payload.counter_number}",
        "called_token": target_token.token_display,
        "counter": payload.counter_number,
        "remaining_waiting": len(remaining_waiting)
    }

@router.post("/{token_id}/arrived")
async def mark_farmer_arrived(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.BUYER, UserRole.ADMIN))
):
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

    audit_service.log_event(
        db, action="TOKEN_ARRIVED", entity_type="TOKEN",
        entity_id=str(token.id),
        details=f"Token {token.token_display} marked arrived at {token.centre.name}"
    )

    return {"success": True, "message": f"Token {token.token_display} marked as arrived at centre gate."}

@router.post("/{token_id}/processing")
async def start_token_processing(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.BUYER, UserRole.ADMIN))
):
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

    audit_service.log_event(
        db, action="TOKEN_PROCESSING", entity_type="TOKEN",
        entity_id=str(token.id),
        details=f"Token {token.token_display} processing started on weighbridge"
    )

    return {"success": True, "message": f"Token {token.token_display} is now being processed on weighbridge."}

@router.post("/{token_id}/skip")
async def skip_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.BUYER, UserRole.ADMIN))
):
    token = db.query(Token).filter(Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    token.status = TokenStatus.SKIPPED
    token.current_position = 0
    if token.queue_entry:
        token.queue_entry.is_active = False
        token.queue_entry.position = 0

    # Re-index remaining waiting tokens
    remaining_waiting = (
        db.query(Token)
        .filter(
            Token.centre_id == token.centre_id,
            Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED]),
            Token.id != token.id
        )
        .order_by(Token.current_position.asc(), Token.id.asc())
        .all()
    )
    for idx, t in enumerate(remaining_waiting):
        new_pos = idx + 1
        t.current_position = new_pos
        if t.queue_entry:
            t.queue_entry.position = new_pos

    db.commit()

    await manager.broadcast_to_centre(str(token.centre_id), {
        "type": "TOKEN_SKIPPED",
        "centre_id": token.centre_id,
        "token_id": token.id,
        "token_display": token.token_display,
        "timestamp": datetime.now().isoformat(),
        "total_waiting": len(remaining_waiting)
    })

    audit_service.log_event(
        db, action="TOKEN_SKIPPED", entity_type="TOKEN",
        entity_id=str(token.id),
        details=f"Token {token.token_display} skipped by operator (unattended when called)"
    )

    return {"success": True, "message": f"Token {token.token_display} skipped and removed from active queue.", "remaining_waiting": len(remaining_waiting)}

@router.post("/{token_id}/complete")
async def complete_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.BUYER, UserRole.ADMIN))
):
    token = db.query(Token).filter(Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    token.status = TokenStatus.COMPLETED
    token.completed_at = datetime.utcnow()
    token.current_position = 0
    if token.queue_entry:
        token.queue_entry.is_active = False
        token.queue_entry.position = 0

    # Re-index remaining waiting tokens
    remaining_waiting = (
        db.query(Token)
        .filter(
            Token.centre_id == token.centre_id,
            Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED]),
            Token.id != token.id
        )
        .order_by(Token.current_position.asc(), Token.id.asc())
        .all()
    )
    for idx, t in enumerate(remaining_waiting):
        new_pos = idx + 1
        t.current_position = new_pos
        if t.queue_entry:
            t.queue_entry.position = new_pos

    db.commit()

    f_user = token.farmer.user if token.farmer else None
    if f_user:
        notification_service.create_notification(
            db, f_user.id,
            "Procurement Completed",
            f"Your procurement cycle for token {token.token_display} is now complete.",
            "COMPLETED"
        )

    await manager.broadcast_to_centre(str(token.centre_id), {
        "type": "TOKEN_COMPLETED",
        "centre_id": token.centre_id,
        "token_id": token.id,
        "token_display": token.token_display,
        "timestamp": datetime.now().isoformat(),
        "total_waiting": len(remaining_waiting)
    })

    audit_service.log_event(
        db, action="TOKEN_COMPLETED", entity_type="TOKEN",
        entity_id=str(token.id),
        details=f"Token {token.token_display} marked completed by operator"
    )

    return {"success": True, "message": f"Token {token.token_display} marked as completed.", "remaining_waiting": len(remaining_waiting)}

