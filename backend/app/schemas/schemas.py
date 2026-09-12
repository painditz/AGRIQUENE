from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.models import UserRole, BookingStatus, TokenStatus, PaymentStatus, PayoutStatus, CentreStatus

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

class UnifiedLoginRequest(BaseModel):
    identifier: str # Mobile number, Email, or Employee ID
    password: Optional[str] = None
    otp: Optional[str] = None

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
    bank_account_masked: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    preferred_crop: str
    preferred_centre_id: Optional[int] = None
    preferred_centre_name: Optional[str] = None
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
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True

class CropResponse(BaseModel):
    id: int
    name: str
    hindi_name: Optional[str] = None
    msp_per_quintal: float
    standard_moisture_pct: float
    max_moisture_pct: float
    grade_a_premium: float
    season: str
    is_active: bool

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
    farmer_id: Optional[int] = None
    farmer_id_card: Optional[str] = None
    farmer_village: Optional[str] = None
    farmer_district: Optional[str] = None
    crop: str
    quantity_quintals: float
    slot_date: Optional[str] = None
    slot_time: str
    booking_reference: Optional[str] = None
    status: TokenStatus
    position: int
    estimated_wait_min: int
    expected_turn_time: str
    counter_assigned: Optional[int] = None
    arrived_at: Optional[datetime] = None
    called_at: Optional[datetime] = None
    started_at: Optional[datetime] = None

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
    procurement_id: Optional[int] = None
    booking_id: Optional[int] = None
    receipt_number: str
    farmer_id: int
    farmer_name: str
    crop: str
    net_weight_quintals: float
    amount: float
    currency: str = "INR"
    purpose: Optional[str] = None
    transaction_ref: str
    utr_number: Optional[str] = None
    bank_account_masked: Optional[str] = None
    bank_name: Optional[str] = None
    payment_mode: str
    status: PaymentStatus
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    failure_reason: Optional[str] = None
    refund_id: Optional[str] = None
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    verified_at: Optional[datetime] = None
    initiated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CreatePaymentOrderRequest(BaseModel):
    amount: float
    booking_id: Optional[int] = None
    procurement_id: Optional[int] = None
    purpose: str = "Weighbridge & Booking Processing Fee"

class PaymentOrderResponse(BaseModel):
    order_id: str
    amount: float
    currency: str = "INR"
    key_id: str
    payment_record_id: int
    purpose: str
    status: str = "CREATED"

class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    payment_record_id: Optional[int] = None

class PaymentFailureRequest(BaseModel):
    order_id: str
    payment_record_id: Optional[int] = None
    error_code: Optional[str] = None
    error_description: Optional[str] = None

class BankDetailsUpdateRequest(BaseModel):
    bank_name: str
    account_number: str
    ifsc_code: str

class AdminRefundRequest(BaseModel):
    reason: str
    refund_amount: Optional[float] = None

class PayoutResponse(BaseModel):
    id: int
    procurement_id: int
    receipt_number: Optional[str] = None
    procurement_receipt_number: Optional[str] = None
    farmer_id: int
    farmer_name: str
    farmer_mobile: Optional[str] = None
    crop: str
    crop_name: Optional[str] = None
    centre_name: Optional[str] = None
    net_weight_quintals: float
    amount: float
    amount_inr: Optional[float] = None
    currency: str = "INR"
    payout_ref: str
    utr_number: Optional[str] = None
    status: PayoutStatus
    bank_account_masked: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    authorized_by: Optional[str] = None
    authorized_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AdminAuthorizePayoutRequest(BaseModel):
    remarks: Optional[str] = "Approved government DBT procurement payout"

class AdminPayoutStatsResponse(BaseModel):
    total_procurement_value: float
    pending_payouts_count: int
    pending_payouts_amount: float
    completed_payouts_count: int
    completed_payouts_amount: float
    failed_payouts_count: int

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

# -------------------------------------------------------------
# System Audit Logs (Requirement 25)
# -------------------------------------------------------------
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Admin Management Requests
# -------------------------------------------------------------
class CentreCreateRequest(BaseModel):
    name: str
    code: str
    address: str
    district: str
    state: str
    pin_code: str
    latitude: Optional[float] = 28.6692
    longitude: Optional[float] = 77.4538
    contact_phone: Optional[str] = "0120-2839100"
    capacity_per_day: int = 150
    active_counters: int = 4
    total_counters: Optional[int] = 6
    avg_processing_time_min: Optional[float] = 8.0
    open_time: Optional[str] = "08:00 AM"
    close_time: Optional[str] = "06:00 PM"
    status: Optional[CentreStatus] = CentreStatus.OPEN

class CentreUpdateRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    capacity_per_day: Optional[int] = None
    active_counters: Optional[int] = None
    status: Optional[CentreStatus] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None

class SlotCreateRequest(BaseModel):
    centre_id: int
    date: str
    start_time: str
    end_time: str
    capacity: int = 30
    is_recommended: bool = False
