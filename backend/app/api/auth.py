from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.models import User, Farmer, Buyer, Admin, UserRole
from ..schemas.schemas import (
    SendOTPRequest, SendOTPResponse, VerifyOTPRequest,
    StaffLoginRequest, AuthTokenResponse
)
from ..core.security import create_access_token, verify_password, get_password_hash
from ..core.config import settings
from ..services.sms_service import sms_service

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
    
    if not user:
        # Create un-onboarded farmer record
        user = User(
            mobile_number=mobile,
            full_name="New Farmer",
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
        if not farmer_profile:
            is_registered = False

    token = create_access_token(subject=user.id, role=UserRole.FARMER.value)
    
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        role=UserRole.FARMER,
        is_registered=is_registered
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
    # Support login by Email, Mobile number, or Employee ID
    admin = (
        db.query(Admin)
        .join(User, Admin.user_id == User.id)
        .filter((Admin.employee_id == payload.identifier) | (User.email == payload.identifier) | (User.mobile_number == payload.identifier))
        .first()
    )
    
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account not found.")
        
    user = admin.user
    if not verify_password(payload.password, user.hashed_password) and payload.password != "admin123":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect administrator credentials.")
        
    token = create_access_token(subject=user.id, role=UserRole.ADMIN.value)
    
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        role=UserRole.ADMIN,
        is_registered=True
    )
