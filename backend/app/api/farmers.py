from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models.models import (
    User, Farmer, Booking, Token, TokenStatus,
    ProcurementRecord, Payment, ProcurementCentre
)
from ..schemas.schemas import (
    FarmerRegisterRequest, FarmerProfileResponse,
    TokenResponse, ProcurementResponse, PaymentResponse
)
from ..core.security import get_current_user
from ..models.models import UserRole
from ..services.audit_service import audit_service

router = APIRouter(prefix="/farmers", tags=["Farmer Services"])

def get_current_farmer_user(user: User = Depends(get_current_user)) -> User:
    if user.role not in [UserRole.FARMER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied: Farmer credentials required.")
    return user

@router.get("/profile", response_model=FarmerProfileResponse)
def get_farmer_profile(user: User = Depends(get_current_farmer_user), db: Session = Depends(get_db)):
    profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not profile:
        # Create empty profile if none
        profile = Farmer(
            user_id=user.id,
            district="Ghaziabad",
            state="Uttar Pradesh",
            land_acres=2.5,
            bank_account_masked="XXXX-XXXX-4921",
            ifsc_code="SBIN0001234",
            preferred_crop="Wheat"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
    return FarmerProfileResponse(
        id=profile.id,
        user_id=user.id,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        farmer_id_card=profile.farmer_id_card,
        father_name=profile.father_name,
        address=profile.address,
        village=profile.village,
        district=profile.district,
        state=profile.state,
        pin_code=profile.pin_code,
        land_acres=profile.land_acres,
        bank_account_masked=profile.bank_account_masked,
        ifsc_code=profile.ifsc_code,
        preferred_crop=profile.preferred_crop,
        preferred_centre_id=profile.preferred_centre_id,
        preferred_centre_name=profile.preferred_centre.name if profile.preferred_centre else None,
        created_at=profile.created_at
    )

@router.post("/register", response_model=FarmerProfileResponse)
def register_farmer_profile(
    payload: FarmerRegisterRequest,
    user: User = Depends(get_current_farmer_user),
    db: Session = Depends(get_db)
):
    user.full_name = payload.full_name
    
    profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not profile:
        profile = Farmer(user_id=user.id)
        db.add(profile)
        
    profile.farmer_id_card = payload.farmer_id_card or f"PMK-IN-2026-{user.mobile_number[-4:]}"
    profile.father_name = payload.father_name
    profile.address = payload.address
    profile.village = payload.village
    profile.district = payload.district
    profile.state = payload.state
    profile.pin_code = payload.pin_code
    profile.land_acres = payload.land_acres
    profile.preferred_crop = payload.preferred_crop
    if payload.preferred_centre_id is not None:
        profile.preferred_centre_id = payload.preferred_centre_id
    
    db.commit()
    db.refresh(profile)
    db.refresh(user)
    
    centre_name = profile.preferred_centre.name if profile.preferred_centre else None
    audit_service.log_event(
        db, action="FARMER_REGISTERED", entity_type="FARMER",
        entity_id=str(profile.id), user_id=user.id,
        details=f"Farmer {user.full_name} ({user.mobile_number}) registered profile in {profile.district}, {profile.state} (Mandi: {centre_name or 'Not assigned'})"
    )
    
    return FarmerProfileResponse(
        id=profile.id,
        user_id=user.id,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        farmer_id_card=profile.farmer_id_card,
        father_name=profile.father_name,
        address=profile.address,
        village=profile.village,
        district=profile.district,
        state=profile.state,
        pin_code=profile.pin_code,
        land_acres=profile.land_acres,
        bank_account_masked=profile.bank_account_masked,
        ifsc_code=profile.ifsc_code,
        preferred_crop=profile.preferred_crop,
        preferred_centre_id=profile.preferred_centre_id,
        preferred_centre_name=centre_name,
        created_at=profile.created_at
    )

@router.get("/current-token", response_model=Optional[TokenResponse])
def get_farmer_active_token(user: User = Depends(get_current_farmer_user), db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not farmer:
        return None
        
    # Get active token (WAITING, ARRIVED, CALLED, or PROCESSING)
    active_token = (
        db.query(Token)
        .filter(
            Token.farmer_id == farmer.id,
            Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED, TokenStatus.CALLED, TokenStatus.PROCESSING])
        )
        .order_by(Token.created_at.desc())
        .first()
    )
    
    if not active_token:
        # Check if there is a recently completed token
        active_token = (
            db.query(Token)
            .filter(Token.farmer_id == farmer.id)
            .order_by(Token.created_at.desc())
            .first()
        )
        if not active_token:
            return None

    # Calculate real-time ETA
    centre = active_token.centre
    waiting_count = (
        db.query(Token)
        .filter(
            Token.centre_id == centre.id,
            Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED])
        )
        .count()
    )
    eta_data = eta_service.calculate_eta(
        token_id=active_token.id,
        token_number=active_token.token_number,
        position=active_token.current_position,
        queue_length=max(1, waiting_count),
        centre_id=centre.id,
        active_counters=centre.active_counters,
        avg_processing_time=centre.avg_processing_time_min,
        crop_type=active_token.booking.crop_type if active_token.booking else "Wheat",
        quantity_quintals=active_token.booking.estimated_quantity_quintals if active_token.booking else 35.0,
        workload_pct=centre.workload_pct
    )

    slot_time = f"{active_token.slot.start_time} - {active_token.slot.end_time}" if active_token.slot else "11:00 AM"

    return TokenResponse(
        id=active_token.id,
        token_number=active_token.token_number,
        token_display=active_token.token_display,
        booking_id=active_token.booking_id,
        booking_reference=active_token.booking.booking_reference,
        farmer_id=farmer.id,
        farmer_name=user.full_name,
        farmer_mobile=user.mobile_number,
        farmer_district=farmer.district,
        centre_id=centre.id,
        centre_name=centre.name,
        slot_id=active_token.slot_id,
        slot_time=slot_time,
        booking_date=active_token.booking.booking_date,
        crop_type=active_token.booking.crop_type,
        quantity_quintals=active_token.booking.estimated_quantity_quintals,
        status=active_token.status,
        current_position=active_token.current_position,
        initial_position=active_token.initial_position,
        predicted_wait_minutes=eta_data["predicted_wait_minutes"],
        expected_turn_time=eta_data["expected_turn_time"],
        recommended_departure_time=eta_data["recommended_departure_time"],
        departure_advice=eta_data["departure_advice"],
        active_counters=centre.active_counters,
        created_at=active_token.created_at
    )

@router.get("/history", response_model=List[ProcurementResponse])
def get_farmer_procurement_history(user: User = Depends(get_current_farmer_user), db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not farmer:
        return []
        
    records = (
        db.query(ProcurementRecord)
        .filter(ProcurementRecord.farmer_id == farmer.id)
        .order_by(ProcurementRecord.verified_at.desc())
        .all()
    )
    
    results = []
    for r in records:
        pay = r.payment
        results.append(ProcurementResponse(
            id=r.id,
            token_id=r.token_id,
            token_display=r.token.token_display if r.token else f"#{r.token_id}",
            farmer_id=farmer.id,
            farmer_name=user.full_name,
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
        ))
    return results

@router.get("/payments", response_model=List[PaymentResponse])
def get_farmer_payments(user: User = Depends(get_current_farmer_user), db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not farmer:
        return []
        
    payments = (
        db.query(Payment)
        .filter(Payment.farmer_id == farmer.id)
        .order_by(Payment.initiated_at.desc())
        .all()
    )
    
    results = []
    for p in payments:
        proc = p.procurement
        results.append(PaymentResponse(
            id=p.id,
            procurement_id=p.procurement_id,
            receipt_number=proc.receipt_number if proc else "N/A",
            farmer_id=farmer.id,
            farmer_name=user.full_name,
            crop=proc.crop_name if proc else "Wheat",
            net_weight_quintals=proc.net_weight_quintals if proc else 40.0,
            amount=p.amount,
            transaction_ref=p.transaction_ref,
            utr_number=p.utr_number,
            bank_account_masked=p.bank_account_masked,
            bank_name=p.bank_name,
            payment_mode=p.payment_mode,
            status=p.status,
            initiated_at=p.initiated_at,
            completed_at=p.completed_at
        ))
    return results
