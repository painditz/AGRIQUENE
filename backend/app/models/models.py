import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from ..db.session import Base

class UserRole(str, enum.Enum):
    FARMER = "FARMER"
    MANDI_OFFICER = "MANDI_OFFICER"
    BUYER = "BUYER"
    ADMIN = "ADMIN"

class BookingStatus(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"

class TokenStatus(str, enum.Enum):
    BOOKED = "BOOKED"
    WAITING = "WAITING"
    ARRIVED = "ARRIVED"
    CALLED = "CALLED"
    INSPECTION = "INSPECTION"
    WEIGHING = "WEIGHING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    PROCUREMENT_COMPLETED = "PROCUREMENT_COMPLETED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"

class PaymentStatus(str, enum.Enum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    SUCCESS = "SUCCESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"

class PayoutStatus(str, enum.Enum):
    CREATED = "CREATED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    REVERSED = "REVERSED"

class RefundStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"

class CentreStatus(str, enum.Enum):
    OPEN = "OPEN"
    BUSY = "BUSY"
    CLOSED = "CLOSED"
    MAINTENANCE = "MAINTENANCE"

# -------------------------------------------------------------
# User & Role Profiles
# -------------------------------------------------------------
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    mobile_number = Column(String(15), unique=True, index=True, nullable=True)
    email = Column(String(100), nullable=True)
    full_name = Column(String(150), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.FARMER, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    farmer_profile = relationship("Farmer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    buyer_profile = relationship("Buyer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    admin_profile = relationship("Admin", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class Farmer(Base):
    __tablename__ = "farmers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    farmer_id_card = Column(String(50), unique=True, index=True, nullable=True) # e.g. PM-KISAN ID / Aadhaar Hash
    father_name = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)
    village = Column(String(100), nullable=True)
    district = Column(String(100), index=True, nullable=False)
    state = Column(String(100), nullable=False)
    pin_code = Column(String(10), nullable=True)
    land_acres = Column(Float, default=2.5)
    bank_account_masked = Column(String(30), nullable=True, default=None)
    ifsc_code = Column(String(20), nullable=True, default=None)
    bank_name = Column(String(100), nullable=True, default=None)
    bank_account_number = Column(String(50), nullable=True, default=None)
    preferred_crop = Column(String(50), default="Wheat")
    preferred_centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=True)
    preferred_slot = Column(String(50), nullable=True, default="09:00 AM - 11:00 AM")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    selected_location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="farmer_profile")
    preferred_centre = relationship("ProcurementCentre")
    bookings = relationship("Booking", back_populates="farmer", cascade="all, delete-orphan")
    tokens = relationship("Token", back_populates="farmer", cascade="all, delete-orphan")
    procurements = relationship("ProcurementRecord", back_populates="farmer")
    payments = relationship("Payment", back_populates="farmer")
    payouts = relationship("Payout", back_populates="farmer", cascade="all, delete-orphan")

class Buyer(Base):
    __tablename__ = "buyers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=True)
    designation = Column(String(100), default="Procurement Officer")
    counter_number = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="buyer_profile")
    centre = relationship("ProcurementCentre", back_populates="buyers")

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), default="Department of Food & Public Distribution")
    access_level = Column(String(50), default="STATE_DIRECTOR")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="admin_profile")

# -------------------------------------------------------------
# Mandi / Procurement Centres & Scheduling
# -------------------------------------------------------------
class ProcurementCentre(Base):
    __tablename__ = "procurement_centres"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    address = Column(Text, nullable=False)
    district = Column(String(100), index=True, nullable=False)
    state = Column(String(100), nullable=False)
    pin_code = Column(String(10), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_phone = Column(String(20), default="1800-180-1551")
    capacity_per_day = Column(Integer, default=150)
    active_counters = Column(Integer, default=4)
    total_counters = Column(Integer, default=6)
    avg_processing_time_min = Column(Float, default=8.0)
    workload_pct = Column(Float, default=65.0)
    open_time = Column(String(10), default="08:00 AM")
    close_time = Column(String(10), default="06:00 PM")
    status = Column(SQLEnum(CentreStatus), default=CentreStatus.OPEN)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    buyers = relationship("Buyer", back_populates="centre")
    slots = relationship("Slot", back_populates="centre", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="centre")
    tokens = relationship("Token", back_populates="centre")
    queue_entries = relationship("QueueEntry", back_populates="centre")

class Crop(Base):
    __tablename__ = "crops"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    hindi_name = Column(String(100), nullable=True)
    msp_per_quintal = Column(Float, nullable=False)   # in INR
    standard_moisture_pct = Column(Float, default=12.0)
    max_moisture_pct = Column(Float, default=14.0)
    grade_a_premium = Column(Float, default=50.0)      # bonus per quintal
    season = Column(String(50), default="Rabi 2026")
    is_active = Column(Boolean, default=True)

class Slot(Base):
    __tablename__ = "slots"
    
    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    date = Column(String(20), index=True, nullable=False) # YYYY-MM-DD
    start_time = Column(String(10), nullable=False)       # "09:00 AM"
    end_time = Column(String(10), nullable=False)         # "10:00 AM"
    capacity = Column(Integer, default=25)
    booked_count = Column(Integer, default=0)
    is_recommended = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    centre = relationship("ProcurementCentre", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot")

# -------------------------------------------------------------
# Bookings, Tokens & Real-Time Queue
# -------------------------------------------------------------
class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(50), unique=True, index=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False)
    crop_type = Column(String(100), default="Wheat", nullable=False)
    estimated_quantity_quintals = Column(Float, default=30.0, nullable=False)
    season = Column(String(50), default="Rabi 2026")
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.CONFIRMED)
    booking_date = Column(String(20), nullable=False)
    preferred_slot = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    farmer = relationship("Farmer", back_populates="bookings")
    centre = relationship("ProcurementCentre", back_populates="bookings")
    slot = relationship("Slot", back_populates="bookings")
    token = relationship("Token", back_populates="booking", uselist=False, cascade="all, delete-orphan")

class Token(Base):
    __tablename__ = "tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(Integer, index=True, nullable=False)
    token_display = Column(String(20), nullable=False) # e.g. "#128"
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False)
    
    status = Column(SQLEnum(TokenStatus), default=TokenStatus.WAITING, index=True)
    current_position = Column(Integer, default=1)
    initial_position = Column(Integer, default=1)
    
    called_at = Column(DateTime, nullable=True)
    arrived_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    booking = relationship("Booking", back_populates="token")
    farmer = relationship("Farmer", back_populates="tokens")
    centre = relationship("ProcurementCentre", back_populates="tokens")
    slot = relationship("Slot")
    queue_entry = relationship("QueueEntry", back_populates="token", uselist=False, cascade="all, delete-orphan")
    procurement_record = relationship("ProcurementRecord", back_populates="token", uselist=False)

class QueueEntry(Base):
    __tablename__ = "queue_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), index=True, nullable=False)
    token_id = Column(Integer, ForeignKey("tokens.id"), unique=True, nullable=False)
    position = Column(Integer, nullable=False)
    counter_assigned = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    centre = relationship("ProcurementCentre", back_populates="queue_entries")
    token = relationship("Token", back_populates="queue_entry")

# -------------------------------------------------------------
# Procurement, Payment, & Notification Logs
# -------------------------------------------------------------
class ProcurementRecord(Base):
    __tablename__ = "procurement_records"
    
    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), unique=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=True)
    
    crop_name = Column(String(100), nullable=False)
    gross_weight_quintals = Column(Float, nullable=False)
    tare_weight_quintals = Column(Float, default=0.0)
    net_weight_quintals = Column(Float, nullable=False)
    moisture_pct = Column(Float, default=11.5)
    quality_grade = Column(String(20), default="Grade A (FAQ)")
    
    base_msp = Column(Float, nullable=False)
    bonus_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False) # net_weight * msp + bonus
    
    receipt_number = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(String(30), default="COMPLETED")
    verified_at = Column(DateTime, default=datetime.utcnow)
    
    token = relationship("Token", back_populates="procurement_record")
    farmer = relationship("Farmer", back_populates="procurements")
    centre = relationship("ProcurementCentre")
    payment = relationship("Payment", back_populates="procurement", uselist=False, cascade="all, delete-orphan")
    payout = relationship("Payout", back_populates="procurement", uselist=False, cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    procurement_id = Column(Integer, ForeignKey("procurement_records.id"), unique=True, nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    transaction_ref = Column(String(100), unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    purpose = Column(String(150), default="MSP Procurement DBT Settlement")
    payment_mode = Column(String(50), default="Direct Benefit Transfer (PFMS / Aadhaar DBT)")
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PROCESSING, index=True)
    razorpay_order_id = Column(String(100), unique=True, index=True, nullable=True)
    razorpay_payment_id = Column(String(100), index=True, nullable=True)
    razorpay_signature = Column(String(255), nullable=True)
    bank_account_masked = Column(String(30), nullable=True)
    bank_name = Column(String(100), nullable=True)
    utr_number = Column(String(50), nullable=True)
    failure_reason = Column(Text, nullable=True)
    refund_id = Column(String(100), nullable=True)
    refund_amount = Column(Float, nullable=True)
    refund_reason = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    initiated_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    procurement = relationship("ProcurementRecord", back_populates="payment")
    booking = relationship("Booking")
    farmer = relationship("Farmer", back_populates="payments")

class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    procurement_id = Column(Integer, ForeignKey("procurement_records.id"), unique=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    payout_ref = Column(String(100), unique=True, index=True, nullable=False)
    utr_number = Column(String(100), nullable=True)
    status = Column(SQLEnum(PayoutStatus), default=PayoutStatus.CREATED, index=True)
    bank_account_masked = Column(String(30), nullable=True)
    bank_name = Column(String(100), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    authorized_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    authorized_at = Column(DateTime, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    procurement = relationship("ProcurementRecord", back_populates="payout")
    farmer = relationship("Farmer", back_populates="payouts")
    authorized_by = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="INFO") # INFO, QUEUE, TOKEN, PROCUREMENT, PAYMENT
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

class SMSLog(Base):
    __tablename__ = "sms_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    mobile_number = Column(String(20), index=True, nullable=False)
    message = Column(Text, nullable=False)
    trigger_event = Column(String(100), nullable=False)
    status = Column(String(30), default="SENT")
    sent_at = Column(DateTime, default=datetime.utcnow)

class ETAPrediction(Base):
    __tablename__ = "eta_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=False)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    predicted_wait_min = Column(Integer, nullable=False)
    turn_time = Column(String(20), nullable=False)
    model_version = Column(String(50), default="XGBoost-v1.0")
    confidence_score = Column(Float, default=0.94)
    calculated_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True) # e.g. USER_LOGIN, TOKEN_CALLED, etc.
    entity_type = Column(String(50), nullable=False, index=True) # TOKEN, BOOKING, CENTRE, PAYMENT, USER
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="audit_logs")
