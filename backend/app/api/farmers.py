from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import random
from ..db.session import get_db
from ..models.models import (
    User, Farmer, Booking, Token, TokenStatus, BookingStatus, Slot, QueueEntry,
    ProcurementRecord, Payment, ProcurementCentre, PaymentStatus
)
from ..schemas.schemas import (
    FarmerRegisterRequest, FarmerProfileResponse,
    TokenResponse, ProcurementResponse, PaymentResponse, BankDetailsUpdateRequest
)
from ..core.security import get_current_user, create_access_token, get_password_hash, decode_access_token
from ..models.models import UserRole
from ..services.audit_service import audit_service
from ..services.eta_service import eta_service

router = APIRouter(prefix="/farmers", tags=["Farmer Services"])


def get_optional_farmer_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None
    token_str = authorization.replace("Bearer ", "").strip()
    if not token_str or token_str in ["null", "undefined"]:
        return None
    try:
        payload = decode_access_token(token_str)
        if payload and "sub" in payload:
            u = db.query(User).filter(User.id == int(payload["sub"])).first()
            if u and u.is_active:
                return u
    except Exception:
        pass
    return None

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
            bank_account_masked=f"•••• •••• {user.mobile_number[-4:] if user.mobile_number else '1234'}",
            ifsc_code="SBIN0001234",
            bank_name="State Bank of India",
            preferred_crop="Wheat"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    elif not profile.bank_account_masked:
        profile.bank_account_masked = f"•••• •••• {user.mobile_number[-4:] if user.mobile_number else '1234'}"
        if not profile.bank_name:
            profile.bank_name = "State Bank of India"
        db.commit()
        db.refresh(profile)
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
    user: Optional[User] = Depends(get_optional_farmer_user),
    db: Session = Depends(get_db)
):
    """
    Registers or updates a farmer profile.
    Supports both authenticated farmers and direct registration from unauthenticated state.
    Stores preferred_centre_id and preferred_slot in the database.
    Optionally generates a live queue Token and Booking record.
    """
    issued_access_token: Optional[str] = None

    if not user:
        if not payload.mobile_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number is required for farmer registration."
            )
        clean_mob = "".join([c for c in payload.mobile_number if c.isdigit()])[-10:]
        if len(clean_mob) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 10-digit Indian mobile number."
            )

        existing_user = db.query(User).filter(User.mobile_number == clean_mob).first()
        if existing_user:
            if existing_user.role != UserRole.FARMER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mobile number {clean_mob} is already registered as {existing_user.role.value}. Please use a farmer mobile number."
                )
            user = existing_user
            user.full_name = payload.full_name
        else:
            user = User(
                mobile_number=clean_mob,
                full_name=payload.full_name,
                role=UserRole.FARMER,
                hashed_password=get_password_hash("farmer123"),
                is_active=True
            )
            db.add(user)
            db.flush()

        issued_access_token = create_access_token(subject=user.id, role=UserRole.FARMER.value)
    else:
        user.full_name = payload.full_name

    profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not profile:
        profile = Farmer(user_id=user.id, district=payload.district, state=payload.state)
        db.add(profile)
        db.flush()

    raw_card = (payload.farmer_id_card or "").strip()
    state_code = "UP"
    if payload.state:
        st_clean = "".join([c for c in payload.state if c.isalnum()]).upper()
        if len(st_clean) >= 2:
            state_code = st_clean[:2]

    mob_suffix = user.mobile_number[-4:] if user.mobile_number and len(user.mobile_number) >= 4 else f"{user.id:04d}"

    if raw_card == "PMK-UP-2026-9481" and user.id != 1:
        raw_card = ""

    if raw_card:
        duplicate = db.query(Farmer).filter(
            Farmer.farmer_id_card == raw_card,
            Farmer.user_id != user.id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Farmer ID / PM-KISAN ID '{raw_card}' is already registered to another account."
            )
        candidate_card = raw_card
    else:
        candidate_card = f"PMK-{state_code}-2026-{mob_suffix}"
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
    if payload.preferred_slot:
        profile.preferred_slot = payload.preferred_slot

    if payload.bank_name:
        profile.bank_name = payload.bank_name
    if payload.bank_account_number:
        clean_acc = payload.bank_account_number.strip()
        profile.bank_account_number = clean_acc
        last4 = clean_acc[-4:] if len(clean_acc) >= 4 else clean_acc
        profile.bank_account_masked = f"•••• •••• {last4}"
    elif not profile.bank_account_masked:
        profile.bank_account_masked = f"•••• •••• {user.mobile_number[-4:] if user.mobile_number else '1234'}"
    if payload.ifsc_code:
        profile.ifsc_code = payload.ifsc_code.upper().strip()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        profile = db.merge(profile)
        user = db.merge(user)
        user.full_name = payload.full_name
        profile.farmer_id_card = f"PMK-{state_code}-2026-{user.id:04d}-{random.randint(100, 999)}"
        db.commit()

    db.refresh(profile)
    db.refresh(user)

    token_display = None
    token_number = None

    if (payload.generate_token or payload.preferred_slot) and profile.preferred_centre_id:
        centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == profile.preferred_centre_id).first()
        if centre:
            active_tok = db.query(Token).filter(
                Token.farmer_id == profile.id,
                Token.centre_id == centre.id,
                Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED, TokenStatus.CALLED, TokenStatus.PROCESSING])
            ).first()

            if active_tok:
                token_display = active_tok.token_display
                token_number = active_tok.token_number
            else:
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
                slot = db.query(Slot).filter(Slot.centre_id == centre.id, Slot.date == today_str).first()
                if not slot:
                    start_t = profile.preferred_slot.split(" - ")[0] if profile.preferred_slot and " - " in profile.preferred_slot else "09:00 AM"
                    end_t = profile.preferred_slot.split(" - ")[1] if profile.preferred_slot and " - " in profile.preferred_slot else "11:00 AM"
                    slot = Slot(
                        centre_id=centre.id,
                        date=today_str,
                        start_time=start_t,
                        end_time=end_t,
                        max_capacity=30,
                        available_count=29
                    )
                    db.add(slot)
                    db.flush()

                waiting_count = (
                    db.query(Token)
                    .filter(
                        Token.centre_id == centre.id,
                        Token.status.in_([TokenStatus.WAITING, TokenStatus.ARRIVED, TokenStatus.CALLED, TokenStatus.PROCESSING])
                    )
                    .count()
                )
                pos = waiting_count + 1
                next_tok_num = (db.query(func.max(Token.token_number)).filter(Token.centre_id == centre.id).scalar() or 0) + 1
                clean_code = centre.code.split('-')[-2] if (centre.code and '-' in centre.code) else (centre.code[:4].upper() if centre.code else "MNDI")
                booking_ref = f"AGQ-2026-{clean_code}-{next_tok_num}"

                booking = Booking(
                    booking_reference=booking_ref,
                    farmer_id=profile.id,
                    centre_id=centre.id,
                    slot_id=slot.id,
                    crop_type=profile.preferred_crop or "Wheat",
                    estimated_quantity_quintals=float(profile.land_acres or 2.5) * 12.0,
                    season="Rabi 2026",
                    status=BookingStatus.CONFIRMED,
                    booking_date=slot.date
                )
                db.add(booking)
                db.flush()

                token_disp = f"#{next_tok_num}"
                token_obj = Token(
                    token_number=next_tok_num,
                    token_display=token_disp,
                    booking_id=booking.id,
                    farmer_id=profile.id,
                    centre_id=centre.id,
                    slot_id=slot.id,
                    status=TokenStatus.WAITING,
                    current_position=pos,
                    initial_position=pos
                )
                db.add(token_obj)
                db.flush()

                queue_entry = QueueEntry(
                    centre_id=centre.id,
                    token_id=token_obj.id,
                    position=pos,
                    is_active=True
                )
                db.add(queue_entry)
                db.commit()

                token_display = token_disp
                token_number = next_tok_num

    centre_name = profile.preferred_centre.name if profile.preferred_centre else None
    audit_service.log_event(
        db, action="FARMER_REGISTERED", entity_type="FARMER",
        entity_id=str(profile.id), user_id=user.id,
        details=f"Farmer {user.full_name} ({user.mobile_number}) registered in {profile.district}, {profile.state} (Mandi: {centre_name or 'None'}, Slot: {profile.preferred_slot})"
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
        preferred_centre_name=centre_name,
        preferred_slot=profile.preferred_slot,
        token_display=token_display,
        token_number=token_number,
        access_token=issued_access_token,
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
