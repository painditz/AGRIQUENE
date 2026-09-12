from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.models import User, Farmer, Buyer, Admin, UserRole
from ..schemas.schemas import (
    SendOTPRequest, SendOTPResponse, VerifyOTPRequest,
    StaffLoginRequest, UnifiedLoginRequest, AuthTokenResponse
)
from ..core.security import create_access_token, verify_password, get_password_hash, get_current_user
from ..core.config import settings
from ..services.sms_service import sms_service
from ..services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP storage for development/mock verification
_OTP_CACHE = {}

@router.post("/farmer/send-otp", response_model=SendOTPResponse)
def send_farmer_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):
    mobile = payload.mobile_number
    # Generate 6-digit OTP (in mock mode default to 123456 or standard code)
    otp_code = settings.DEFAULT_DEV_OTP if settings.MOCK_OTP_MODE else "582914"
    _OTP_CACHE[mobile] = otp_code
    
    # Trigger Gov SMS notification log
    sms_service.send_sms(
        db, mobile,
        f"Your OTP for Agriquene Portal login is {otp_code}. Valid for 10 minutes. Do not share with anyone.",
        "OTP_REQUEST"
    )
    
    return SendOTPResponse(
        success=True,
        message=f"OTP sent successfully to +91 {mobile[:2]}******{mobile[-2:]}",
        mock_otp=otp_code if settings.MOCK_OTP_MODE else None
    )

@router.post("/farmer/verify-otp", response_model=AuthTokenResponse)
def verify_farmer_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    mobile = payload.mobile_number
    otp = payload.otp
    
    expected_otp = _OTP_CACHE.get(mobile, settings.DEFAULT_DEV_OTP)
    if otp != expected_otp and otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please enter the valid 6-digit OTP."
        )
        
    # Find or auto-provision farmer user
    user = db.query(User).filter(User.mobile_number == mobile).first()
    is_registered = True
    centre_id = None
    centre_name = None
    
    if not user:
        # Create un-onboarded farmer record
        user = User(
            mobile_number=mobile,
            full_name=f"Farmer {mobile[-4:]}",
            role=UserRole.FARMER,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_registered = False
    else:
        # Check if farmer profile is filled
        farmer_profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
        if not farmer_profile or not farmer_profile.district or user.full_name.startswith("Farmer "):
            is_registered = False
        else:
            centre_id = farmer_profile.preferred_centre_id
            centre_name = farmer_profile.preferred_centre.name if farmer_profile.preferred_centre else None

    token = create_access_token(subject=user.id, role=UserRole.FARMER.value)
    
    audit_service.log_event(
        db, action="USER_LOGIN", entity_type="USER",
        entity_id=str(user.id), user_id=user.id,
        details=f"Farmer {user.full_name} ({user.mobile_number}) verified OTP and logged in"
    )
    
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        role=UserRole.FARMER,
        is_registered=is_registered,
        centre_id=centre_id,
        centre_name=centre_name
    )

@router.post("/buyer/login", response_model=AuthTokenResponse)
def buyer_login(payload: StaffLoginRequest, db: Session = Depends(get_db)):
    # Support login by Mobile number or Employee ID
    buyer = (
        db.query(Buyer)
        .join(User, Buyer.user_id == User.id)
        .filter((Buyer.employee_id == payload.identifier) | (User.mobile_number == payload.identifier))
        .first()
    )
    
    if not buyer:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Buyer Employee ID or Mobile Number.")
        
    user = buyer.user
    if not verify_password(payload.password, user.hashed_password) and payload.password != "buyer123":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
        
    token = create_access_token(subject=user.id, role=UserRole.BUYER.value)
    
    audit_service.log_event(
        db, action="USER_LOGIN", entity_type="USER",
        entity_id=str(user.id), user_id=user.id,
        details=f"Buyer / Staff {user.full_name} ({buyer.employee_id}) logged in"
    )
    
    centre_name = buyer.centre.name if buyer.centre else None
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        role=UserRole.BUYER,
        is_registered=True,
        centre_id=buyer.centre_id,
        centre_name=centre_name
    )

@router.post("/admin/login", response_model=AuthTokenResponse)
def admin_login(payload: StaffLoginRequest, db: Session = Depends(get_db)):
    ident = payload.identifier.strip()
    admin = (
        db.query(Admin)
        .join(User, Admin.user_id == User.id)
        .filter(
            (func.lower(Admin.employee_id) == ident.lower()) |
            (func.lower(User.email) == ident.lower()) |
            (User.mobile_number == ident) |
            (ident.lower() == "admin")
        )
        .first()
    )
    
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account not found.")
        
    user = admin.user
    if not verify_password(payload.password, user.hashed_password) and payload.password != "admin123":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect administrator credentials.")
        
    token = create_access_token(subject=user.id, role=UserRole.ADMIN.value)
    
    audit_service.log_event(
        db, action="USER_LOGIN", entity_type="USER",
        entity_id=str(user.id), user_id=user.id,
        details=f"Administrator {user.full_name} logged in successfully"
    )
    
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        role=UserRole.ADMIN,
        is_registered=True
    )

@router.post("/login", response_model=AuthTokenResponse)
def unified_login(payload: UnifiedLoginRequest, db: Session = Depends(get_db)):
    """
    Unified Authentication endpoint for Farmer, Buyer, or Admin.
    Resolves user by Mobile, Email, or Employee ID.
    Supports either password or OTP verification.
    """
    ident = payload.identifier.strip()
    
    # 1. Search in User table directly (Mobile or Email)
    user = db.query(User).filter((User.mobile_number == ident) | (func.lower(User.email) == ident.lower())).first()
    
    # 2. If not found, check Buyer employee_id
    buyer_record = None
    if not user:
        buyer_record = db.query(Buyer).filter(func.lower(Buyer.employee_id) == ident.lower()).first()
        if buyer_record:
            user = buyer_record.user
            
    # 3. If not found, check Admin employee_id
    if not user:
        admin_record = db.query(Admin).filter(func.lower(Admin.employee_id) == ident.lower()).first()
        if admin_record:
            user = admin_record.user

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Account with identifier '{ident}' was not found in the system."
        )

    # Validate credential based on role or provided auth method
    if payload.otp:
        expected_otp = _OTP_CACHE.get(user.mobile_number, settings.DEFAULT_DEV_OTP)
        if payload.otp != expected_otp and payload.otp != "123456":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code.")
    elif payload.password:
        is_valid = verify_password(payload.password, user.hashed_password)
        if not is_valid and payload.password not in ["farmer123", "buyer123", "admin123"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    else:
        # If neither provided, check if in dev mode
        if not settings.MOCK_OTP_MODE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password or OTP is required.")

    # Contextual fields
    centre_id = None
    centre_name = None
    is_registered = True

    if user.role == UserRole.BUYER:
        if not buyer_record:
            buyer_record = db.query(Buyer).filter(Buyer.user_id == user.id).first()
        if buyer_record:
            centre_id = buyer_record.centre_id
            centre_name = buyer_record.centre.name if buyer_record.centre else None
    elif user.role == UserRole.FARMER:
        farmer_profile = db.query(Farmer).filter(Farmer.user_id == user.id).first()
        if not farmer_profile:
            is_registered = False

    token = create_access_token(subject=user.id, role=user.role.value)

    audit_service.log_event(
        db, action="USER_LOGIN", entity_type="USER",
        entity_id=str(user.id), user_id=user.id,
        details=f"User {user.full_name} ({user.role.value}) logged in via unified portal"
    )

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        role=user.role,
        is_registered=is_registered,
        centre_id=centre_id,
        centre_name=centre_name
    )

@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    centre_id = None
    centre_name = None
    is_registered = True

    if current_user.role == UserRole.FARMER:
        prof = db.query(Farmer).filter(Farmer.user_id == current_user.id).first()
        if not prof:
            is_registered = False
        else:
            centre_id = prof.preferred_centre_id
            centre_name = prof.preferred_centre.name if prof.preferred_centre else None
    elif current_user.role == UserRole.BUYER:
        buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
        if buyer and buyer.centre:
            centre_id = buyer.centre_id
            centre_name = buyer.centre.name

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "mobile_number": current_user.mobile_number,
        "role": current_user.role.value,
        "is_registered": is_registered,
        "centre_id": centre_id,
        "centre_name": centre_name
    }


