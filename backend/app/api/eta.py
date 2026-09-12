from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.models import Token, ProcurementCentre, TokenStatus
from ..schemas.schemas import ETAResponse
from ..services.eta_service import eta_service

router = APIRouter(prefix="/eta", tags=["AI ETA Prediction"])

@router.get("/{token_id}", response_model=ETAResponse)
def get_token_eta(token_id: int, db: Session = Depends(get_db)):
    # Look up by token ID or token number
    token = (
        db.query(Token)
        .filter((Token.id == token_id) | (Token.token_number == token_id))
        .first()
    )
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    centre = token.centre
    waiting_count = (
        db.query(Token)
        .filter(Token.centre_id == centre.id, Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED]))
        .count()
    )

    crop_type = token.booking.crop_type if token.booking else "Wheat"
    quantity = token.booking.estimated_quantity_quintals if token.booking else 35.0

    eta_data = eta_service.calculate_eta(
        token_id=token.id,
        token_number=token.token_number,
        position=token.current_position,
        queue_length=max(1, waiting_count),
        centre_id=centre.id,
        active_counters=centre.active_counters,
        avg_processing_time=centre.avg_processing_time_min,
        crop_type=crop_type,
        quantity_quintals=quantity,
        workload_pct=centre.workload_pct
    )

    return ETAResponse(
        token_id=token.id,
        token_number=token.token_number,
        token_display=token.token_display,
        centre_id=centre.id,
        centre_name=centre.name,
        queue_position=token.current_position,
        queue_length=max(1, waiting_count),
        active_counters=centre.active_counters,
        predicted_wait_minutes=eta_data["predicted_wait_minutes"],
        expected_turn_time=eta_data["expected_turn_time"],
        recommended_departure_time=eta_data["recommended_departure_time"],
        departure_advice=eta_data["departure_advice"],
        urgency=eta_data["urgency"],
        is_demo_prediction=eta_data["is_demo_prediction"],
        model_version=eta_data["model_version"],
        confidence_score=eta_data["confidence_score"],
        updated_at=eta_data["updated_at"]
    )
