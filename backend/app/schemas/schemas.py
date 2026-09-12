from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.models import UserRole, BookingStatus, TokenStatus, PaymentStatus, CentreStatus

# -------------------------------------------------------------
# Auth Schemas
# -------------------------------------------------------------
class SendOTPRequest(BaseModel):
    mobile_number: str = Field(..., pattern=r"^[6-9]\d{9}$", description="10-digit Indian mobile number")

class SendOTPResponse(BaseModel):
    success: bool
    message: str
    mock_otp: Optional[str] = None # Provided in mock mode for instant developer convenience

class VerifyOTPRequest(BaseModel):
    mobile_number: str
    otp: str = Field(..., min_length=4, max_length=6)

class StaffLoginRequest(BaseModel):
    identifier: str # Mobile number or Employee ID
    password: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    mobile_number: str
    role: UserRole
    is_registered: bool = True
    centre_id: Optional[int] = None
    centre_name: Optional[str] = None

# -------------------------------------------------------------
# Farmer Profile & Registration Schemas
# -------------------------------------------------------------
class FarmerRegisterRequest(BaseModel):
    full_name: str
    farmer_id_card: Optional[str] = None
    father_name: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    district: str
    state: str
    pin_code: Optional[str] = None
    land_acres: float = 2.5
    preferred_crop: str = "Wheat"
    preferred_centre_id: Optional[int] = None

class FarmerProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    mobile_number: str
    farmer_id_card: Optional[str] = None
    father_name: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    district: str
    state: str
    pin_code: Optional[str] = None
    land_acres: float
    bank_account_masked: str
    ifsc_code: str
    preferred_crop: str
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Procurement Centres & Slots
# -------------------------------------------------------------
class SlotResponse(BaseModel):
    id: int
    centre_id: int
    date: str
    start_time: str
    end_time: str
    capacity: int
    booked_count: int
    available_count: int
    is_recommended: bool
    is_active: bool

    class Config:
        from_attributes = True

class CentreResponse(BaseModel):
    id: int
    name: str
    code: str
    address: str
    district: str
    state: str
    pin_code: str
    latitude: float
    longitude: float
    contact_phone: str
    capacity_per_day: int
    active_counters: int
    total_counters: int
    avg_processing_time_min: float
    workload_pct: float
    open_time: str
    close_time: str
    status: CentreStatus
    current_waiting_count: int = 0
    estimated_wait_min: int = 0
    available_slots_today: int = 0
    distance_km: Optional[float] = 3.5

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Booking & Tokens
# -------------------------------------------------------------
class BookingCreateRequest(BaseModel):
    centre_id: int
    slot_id: int
    crop_type: str
    estimated_quantity_quintals: float
    season: str = "Rabi 2026"

class TokenResponse(BaseModel):
    id: int
    token_number: int
    token_display: str
    booking_id: int
    booking_reference: str
    farmer_id: int
    farmer_name: str
    farmer_mobile: str
    farmer_district: str
    centre_id: int
    centre_name: str
    slot_id: int
    slot_time: str
    booking_date: str
    crop_type: str
    quantity_quintals: float
    status: TokenStatus
    current_position: int
    initial_position: int
    predicted_wait_minutes: int
    expected_turn_time: str
    recommended_departure_time: str
    departure_advice: str
    active_counters: int
    created_at: datetime

    class Config:
        from_attributes = True

class QueueCallRequest(BaseModel):
    token_id: Optional[int] = None
    counter_number: int = 1

class QueueItem(BaseModel):
    token_id: int
    token_number: int
    token_display: str
    farmer_name: str
    farmer_mobile_masked: str
    crop: str
    quantity_quintals: float
    slot_time: str
    status: TokenStatus
    position: int
    estimated_wait_min: int
    expected_turn_time: str
    counter_assigned: Optional[int] = None

class CentreQueueStatusResponse(BaseModel):
    centre_id: int
    centre_name: str
    active_counters: int
    total_waiting: int
    total_completed_today: int
    current_serving_token: Optional[str] = None
    current_serving_id: Optional[int] = None
    avg_processing_time_min: float
    queue: List[QueueItem]
    updated_at: str

# -------------------------------------------------------------
# ETA Prediction
# -------------------------------------------------------------
class ETAResponse(BaseModel):
    token_id: int
    token_number: int
    token_display: str
    centre_id: int
    centre_name: str
    queue_position: int
    queue_length: int
    active_counters: int
    predicted_wait_minutes: int
    expected_turn_time: str
    recommended_departure_time: str
    departure_advice: str
    urgency: str
    is_demo_prediction: bool
    model_version: str
    confidence_score: float
    updated_at: str

# -------------------------------------------------------------
# Procurement & Payment
# -------------------------------------------------------------
class ProcurementSubmitRequest(BaseModel):
    token_id: int
    gross_weight_quintals: float
    tare_weight_quintals: float = 0.0
    moisture_pct: float = 11.8
    quality_grade: str = "Grade A (FAQ)"
    base_msp: Optional[float] = None
    bonus_amount: float = 0.0
    remarks: Optional[str] = None

class ProcurementResponse(BaseModel):
    id: int
    token_id: int
    token_display: str
    farmer_id: int
    farmer_name: str
    centre_name: str
    crop_name: str
    gross_weight_quintals: float
    tare_weight_quintals: float
    net_weight_quintals: float
    moisture_pct: float
    quality_grade: str
    base_msp: float
    bonus_amount: float
    total_amount: float
    receipt_number: str
    status: str
    verified_at: datetime
    payment_status: PaymentStatus
    payment_transaction_ref: Optional[str] = None

    class Config:
        from_attributes = True

class PaymentUpdateStatusRequest(BaseModel):
    status: PaymentStatus
    utr_number: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    procurement_id: int
    receipt_number: str
    farmer_id: int
    farmer_name: str
    crop: str
    net_weight_quintals: float
    amount: float
    transaction_ref: str
    utr_number: Optional[str] = None
    bank_account_masked: str
    bank_name: str
    payment_mode: str
    status: PaymentStatus
    initiated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Notifications & SMS Logs
# -------------------------------------------------------------
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SMSLogResponse(BaseModel):
    id: int
    mobile_number: str
    message: str
    trigger_event: str
    status: str
    sent_at: datetime

    class Config:
        from_attributes = True
