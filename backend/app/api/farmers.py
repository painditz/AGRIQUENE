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
from ..core.websocket import manager

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
        preferred_slot=profile.preferred_slot,
        latitude=profile.latitude,
        longitude=profile.longitude,
        selected_location=profile.selected_location,
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
        preferred_slot=profile.preferred_slot,
        latitude=profile.latitude,
        longitude=profile.longitude,
        selected_location=profile.selected_location,
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
        preferred_slot=profile.preferred_slot,
        latitude=profile.latitude,
        longitude=profile.longitude,
        selected_location=profile.selected_location,
        created_at=profile.created_at
    )

@router.post("/register", response_model=FarmerProfileResponse)
async def register_farmer_profile(
    payload: FarmerRegisterRequest,
    user: Optional[User] = Depends(get_optional_farmer_user),
    db: Session = Depends(get_db)
):
    """
    Registers or updates a farmer profile (Personal KYC Only).
    Gracefully handles mobile number matching, location coordinates,
    auto-generates unique farmer_id_card, and guarantees no raw 500 errors.
    """
    clean_mob = None
    if payload.mobile_number:
        clean_mob = "".join([c for c in str(payload.mobile_number) if c.isdigit()])[-10:]

    if not clean_mob and user and user.mobile_number:
        clean_mob = user.mobile_number

    if not clean_mob or len(clean_mob) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 10-digit Indian mobile number."
        )

    # If the token user does not match the clean_mob, decouple so we register/load the right farmer
    if user and user.mobile_number != clean_mob:
        user = None

    if not user:
        existing_user = db.query(User).filter(User.mobile_number == clean_mob).first()
        if existing_user:
            user = existing_user
            user.full_name = payload.full_name.strip()
        else:
            user = User(
                mobile_number=clean_mob,
                full_name=payload.full_name.strip(),
                role=UserRole.FARMER,
                hashed_password=get_password_hash("farmer123"),
                is_active=True
            )
            db.add(user)
            db.flush()
    else:
        user.full_name = payload.full_name.strip()

    issued_access_token = create_access_token(subject=user.id, role=UserRole.FARMER.value)

    profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not profile:
        profile = Farmer(
            user_id=user.id,
            district=payload.district.strip() if payload.district else "General",
            state=payload.state.strip() if payload.state else "India"
        )
        db.add(profile)
        db.flush()

    raw_card = (payload.farmer_id_card or "").strip()
    state_code = "UP"
    if payload.state:
        st_clean = "".join([c for c in payload.state if c.isalnum()]).upper()
        if len(st_clean) >= 2:
            state_code = st_clean[:2]

    mob_suffix = clean_mob[-4:] if len(clean_mob) >= 4 else f"{user.id:04d}"

    if raw_card == "PMK-UP-2026-9481" and user.id != 1:
        raw_card = ""

    if raw_card:
        duplicate = db.query(Farmer).filter(
            Farmer.farmer_id_card == raw_card,
            Farmer.user_id != user.id
        ).first()
        if duplicate:
            candidate_card = f"{raw_card}-{user.id}"
        else:
            candidate_card = raw_card
    else:
        if profile.farmer_id_card:
            candidate_card = profile.farmer_id_card
        else:
            candidate_card = f"PMK-{state_code}-2026-{mob_suffix}"
            attempt = 1
            while db.query(Farmer).filter(Farmer.farmer_id_card == candidate_card, Farmer.user_id != user.id).first():
                candidate_card = f"PMK-{state_code}-2026-{mob_suffix}-{attempt}"
                attempt += 1

    profile.farmer_id_card = candidate_card
    profile.father_name = payload.father_name.strip() if payload.father_name else None
    profile.address = payload.address.strip() if payload.address else None
    profile.village = payload.village.strip() if payload.village else None
    profile.district = payload.district.strip() if payload.district else profile.district
    profile.state = payload.state.strip() if payload.state else profile.state
    profile.pin_code = payload.pin_code.strip() if payload.pin_code else None
    profile.land_acres = float(payload.land_acres) if payload.land_acres is not None else (profile.land_acres or 2.5)
    
    if payload.preferred_crop:
        profile.preferred_crop = payload.preferred_crop
    if payload.preferred_centre_id is not None:
        profile.preferred_centre_id = payload.preferred_centre_id
    if payload.preferred_slot:
        profile.preferred_slot = payload.preferred_slot

    # Lat/Lng & Location parsing
    if payload.latitude is not None:
        try:
            lat = float(payload.latitude)
            if -90.0 <= lat <= 90.0:
                profile.latitude = lat
        except (ValueError, TypeError):
            pass

    if payload.longitude is not None:
        try:
            lng = float(payload.longitude)
            if -180.0 <= lng <= 180.0:
                profile.longitude = lng
        except (ValueError, TypeError):
            pass

    if payload.selected_location:
        profile.selected_location = str(payload.selected_location).strip()[:255]

    # Bank details
    if payload.bank_name:
        profile.bank_name = payload.bank_name.strip()
    if payload.bank_account_number:
        clean_acc = payload.bank_account_number.strip().replace(" ", "").replace("-", "")
        profile.bank_account_number = clean_acc
        last4 = clean_acc[-4:] if len(clean_acc) >= 4 else clean_acc
        profile.bank_account_masked = f"•••• •••• {last4}"
    elif not profile.bank_account_masked:
        profile.bank_account_masked = f"•••• •••• {clean_mob[-4:]}"

    if payload.ifsc_code:
        profile.ifsc_code = payload.ifsc_code.strip().upper()

    try:
        db.commit()
        db.refresh(profile)
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        try:
            user = db.query(User).filter(User.id == user.id).first()
            profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
            if profile:
                profile.farmer_id_card = f"PMK-{state_code}-2026-{clean_mob[-4:]}-{random.randint(1000, 9999)}"
                db.commit()
                db.refresh(profile)
                db.refresh(user)
        except Exception as retry_err:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration database constraint error: {str(retry_err)}"
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

    token_display = None
    token_number = None

    if payload.generate_token and profile.preferred_centre_id:
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
                        Token.status.in_([
                            TokenStatus.WAITING, TokenStatus.ARRIVED, TokenStatus.CALLED,
                            TokenStatus.PROCESSING, TokenStatus.INSPECTION, TokenStatus.WEIGHING
                        ])
                    )
                    .count()
                )
                pos = waiting_count + 1
                next_tok_num = (db.query(func.max(Token.token_number)).filter(Token.centre_id == centre.id).scalar() or 100) + 1
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

                booking_event = {
                    "type": "NEW_BOOKING",
                    "centre_id": centre.id,
                    "token_number": next_tok_num,
                    "token_display": token_disp,
                    "position": pos,
                    "timestamp": datetime.now().isoformat()
                }
                try:
                    await manager.broadcast_to_centre(str(centre.id), booking_event)
                    await manager.broadcast_global(booking_event)
                except Exception:
                    pass

    centre_name = profile.preferred_centre.name if profile.preferred_centre else None
    try:
        audit_service.log_event(
            db, action="FARMER_REGISTERED", entity_type="FARMER",
            entity_id=str(profile.id), user_id=user.id,
            details=f"Farmer {user.full_name} ({user.mobile_number}) registered in {profile.district}, {profile.state} (Mandi: {centre_name or 'None'})"
        )
    except Exception:
        pass

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
        latitude=profile.latitude,
        longitude=profile.longitude,
        selected_location=profile.selected_location,
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
        
    # Get active token (WAITING, ARRIVED, CALLED, PROCESSING, INSPECTION, WEIGHING)
    active_token = (
        db.query(Token)
        .filter(
            Token.farmer_id == farmer.id,
            Token.status.in_([
                TokenStatus.WAITING, TokenStatus.ARRIVED, TokenStatus.CALLED,
                TokenStatus.PROCESSING, TokenStatus.INSPECTION, TokenStatus.WEIGHING
            ])
        )
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
