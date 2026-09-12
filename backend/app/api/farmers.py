from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import random
from ..db.session import get_db
from ..models.models import (
    User, Farmer, Booking, Token, TokenStatus,
    ProcurementRecord, Payment, ProcurementCentre, PaymentStatus
)
from ..schemas.schemas import (
    FarmerRegisterRequest, FarmerProfileResponse,
    TokenResponse, ProcurementResponse, PaymentResponse, BankDetailsUpdateRequest
)
from ..core.security import get_current_user
from ..models.models import UserRole
from ..services.audit_service import audit_service
from ..services.eta_service import eta_service

router = APIRouter(prefix="/farmers", tags=["Farmer Services"])

def get_current_farmer_user(user: User = Depends(get_current_user)) -> User:
    if user.role not in [UserRole.FARMER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied: Farmer credentials required.")
    return user

@router.get("/profile", response_model=FarmerProfileResponse)
def get_farmer_profile(user: User = Depends(get_current_farmer_user), db: Session = Depends(get_db)):
    profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not profile:
        profile = Farmer(
            user_id=user.id,
            district="National Capital Region",
            state="Delhi",
            land_acres=2.5,
            bank_account_masked=None,
            ifsc_code=None,
            bank_name=None,
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
        bank_name=profile.bank_name,
        ifsc_code=profile.ifsc_code,
        preferred_crop=profile.preferred_crop,
        preferred_centre_id=profile.preferred_centre_id,
        preferred_centre_name=profile.preferred_centre.name if profile.preferred_centre else None,
        created_at=profile.created_at
    )

@router.put("/bank-details", response_model=FarmerProfileResponse)
def update_farmer_bank_details(
    payload: BankDetailsUpdateRequest,
    user: User = Depends(get_current_farmer_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not profile:
        profile = Farmer(user_id=user.id, district="General", state="India")
        db.add(profile)
        db.flush()

    clean_acc = payload.account_number.strip().replace(" ", "").replace("-", "")
    if len(clean_acc) < 4:
        raise HTTPException(status_code=400, detail="Bank account number must be at least 4 digits.")

    # Secure masking: only last 4 digits visible
    masked = f"•••• •••• {clean_acc[-4:]}"
    profile.bank_account_number = clean_acc
    profile.bank_account_masked = masked
    profile.bank_name = payload.bank_name.strip()
    profile.ifsc_code = payload.ifsc_code.strip().upper()
    db.commit()
    db.refresh(profile)

    audit_service.log_event(
        db, action="FARMER_BANK_DETAILS_UPDATED", entity_type="FARMER",
        entity_id=str(profile.id), user_id=user.id,
        details=f"Farmer {user.full_name} updated bank account: {profile.bank_name} ({masked})"
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
        bank_name=profile.bank_name,
        ifsc_code=profile.ifsc_code,
        preferred_crop=profile.preferred_crop,
        preferred_centre_id=profile.preferred_centre_id,
        preferred_centre_name=profile.preferred_centre.name if profile.preferred_centre else None,
        created_at=profile.created_at
    )

from pydantic import BaseModel

class UpdatePreferredCentreRequest(BaseModel):
    centre_id: int

@router.put("/preferred-centre", response_model=FarmerProfileResponse)
def update_preferred_centre(
    payload: UpdatePreferredCentreRequest,
    user: User = Depends(get_current_farmer_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not profile:
        profile = Farmer(user_id=user.id, district="General", state="India")
        db.add(profile)
        db.flush()

    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == payload.centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Selected procurement centre not found.")

    profile.preferred_centre_id = centre.id
    db.commit()
    db.refresh(profile)

    audit_service.log_event(
        db, action="FARMER_CENTRE_UPDATED", entity_type="FARMER",
        entity_id=str(profile.id), user_id=user.id,
        details=f"Farmer {user.full_name} updated preferred centre to {centre.name} (ID: {centre.id})"
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
        preferred_centre_id=centre.id,
        preferred_centre_name=centre.name,
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
        
    # Determine unique farmer_id_card
    raw_card = (payload.farmer_id_card or "").strip()
    
    # State code helper for ID generation
    state_code = "UP"
    if payload.state:
        st_clean = "".join([c for c in payload.state if c.isalnum()]).upper()
        if len(st_clean) >= 2:
            state_code = st_clean[:2]
            
    mob_suffix = user.mobile_number[-4:] if user.mobile_number and len(user.mobile_number) >= 4 else f"{user.id:04d}"

    # If the payload sends the seed demo default ("PMK-UP-2026-9481") and caller is not Ramesh (user_id 1),
    # treat it as unassigned / default request so we generate a unique card for this new user
    if raw_card == "PMK-UP-2026-9481" and user.id != 1:
        raw_card = ""

    if raw_card:
        # User explicitly supplied a custom ID card. Ensure no other farmer is using it.
        duplicate = db.query(Farmer).filter(
            Farmer.farmer_id_card == raw_card,
            Farmer.user_id != user.id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Farmer ID / PM-KISAN ID '{raw_card}' is already registered to another account. Please enter your unique PM-KISAN / KCC number."
            )
        candidate_card = raw_card
    else:
        # Generate unique candidate card
        candidate_card = f"PMK-{state_code}-2026-{mob_suffix}"
        # If candidate card already in use by another user, generate a unique variant
        attempt = 1
        while db.query(Farmer).filter(Farmer.farmer_id_card == candidate_card, Farmer.user_id != user.id).first():
            candidate_card = f"PMK-{state_code}-2026-{user.id:02d}{mob_suffix}-{attempt}"
            attempt += 1

    profile.farmer_id_card = candidate_card
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
    
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # After rollback, the profile object may be expunged. Re-merge it.
        profile = db.merge(profile)
        # Re-apply user name since it was rolled back
        user = db.merge(user)
        user.full_name = payload.full_name
        # Fallback deduplication for race conditions
        profile.farmer_id_card = f"PMK-{state_code}-2026-{user.id:04d}-{random.randint(100, 999)}"
        try:
            db.commit()
        except Exception as inner_exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to register profile due to a database constraint: {str(inner_exc)}"
            )
    
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
        crop_display = proc.crop_name if proc else (p.purpose or "Weighbridge / Booking Service")
        weight_display = proc.net_weight_quintals if proc else 0.0
        receipt_display = proc.receipt_number if proc else p.transaction_ref
        bank_masked = p.bank_account_masked or farmer.bank_account_masked
        bank_display = p.bank_name or farmer.bank_name

        results.append(PaymentResponse(
            id=p.id,
            procurement_id=p.procurement_id,
            booking_id=p.booking_id,
            receipt_number=receipt_display,
            farmer_id=farmer.id,
            farmer_name=user.full_name,
            crop=crop_display,
            net_weight_quintals=weight_display,
            amount=p.amount,
            currency=p.currency or "INR",
            purpose=p.purpose,
            transaction_ref=p.transaction_ref,
            utr_number=p.utr_number,
            bank_account_masked=bank_masked,
            bank_name=bank_display,
            payment_mode=p.payment_mode,
            status=p.status,
            razorpay_order_id=p.razorpay_order_id,
            razorpay_payment_id=p.razorpay_payment_id,
            failure_reason=p.failure_reason,
            refund_id=p.refund_id,
            refund_amount=p.refund_amount,
            refund_reason=p.refund_reason,
            verified_at=p.verified_at,
            initiated_at=p.initiated_at,
            completed_at=p.completed_at
        ))
    return results
