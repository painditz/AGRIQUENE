from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.models import (
    User, Farmer, Buyer, Admin, UserRole,
    ProcurementCentre, CentreStatus, Crop, Slot,
    Booking, Token, TokenStatus, BookingStatus,
    QueueEntry, ProcurementRecord, Payment, PaymentStatus,
    Notification, SMSLog
)
from ..core.security import get_password_hash

def ensure_staff_officers(db: Session):
    """
    Ensure the two required Mandi Staff / Procurement Officer accounts exist:
    1. Ashmit Baliyan (Username: ASHMIT BALIYAN, Role: UserRole.MANDI_OFFICER, Password: ASH@MI5T)
    2. Aryan (Username: ARYAN, Role: UserRole.MANDI_OFFICER, Password: ASH@MI5T)
    Assigned Mandi: Narela Krishi Grain Mandi (APMC)
    Designation: Mandi Staff Officer
    """
    narela = db.query(ProcurementCentre).filter(ProcurementCentre.name.ilike("%Narela%")).first()
    if not narela:
        narela = db.query(ProcurementCentre).first()
    centre_id = narela.id if narela else 1

    # Officer 1: Ashmit Baliyan
    ashmit = (
        db.query(User)
        .filter(
            (func.lower(User.username) == "ashmit baliyan") |
            (func.lower(User.username) == "ashmit") |
            (User.email == "ashmit.baliyan@agriquene.gov.in")
        )
        .first()
    )
    if not ashmit:
        ashmit = User(
            username="ASHMIT BALIYAN",
            full_name="Ashmit Baliyan",
            role=UserRole.MANDI_OFFICER,
            email="ashmit.baliyan@agriquene.gov.in",
            mobile_number="9811223301",
            hashed_password=get_password_hash("ASH@MI5T"),
            is_active=True
        )
        db.add(ashmit)
        db.flush()
        ashmit_buyer = Buyer(
            user_id=ashmit.id,
            employee_id="STAFF-ASHMIT",
            centre_id=centre_id,
            designation="Mandi Staff Officer",
            counter_number=1,
            is_active=True
        )
        db.add(ashmit_buyer)
    else:
        ashmit.username = "ASHMIT BALIYAN"
        ashmit.full_name = "Ashmit Baliyan"
        ashmit.role = UserRole.MANDI_OFFICER
        ashmit.hashed_password = get_password_hash("ASH@MI5T")
        ashmit.is_active = True
        buyer_rec = db.query(Buyer).filter(Buyer.user_id == ashmit.id).first()
        if not buyer_rec:
            buyer_rec = Buyer(
                user_id=ashmit.id,
                employee_id="STAFF-ASHMIT",
                centre_id=centre_id,
                designation="Mandi Staff Officer",
                counter_number=1,
                is_active=True
            )
            db.add(buyer_rec)
        else:
            buyer_rec.designation = "Mandi Staff Officer"
            buyer_rec.centre_id = centre_id
            buyer_rec.is_active = True

    # Officer 2: Aryan
    aryan = (
        db.query(User)
        .filter(
            (func.lower(User.username) == "aryan") |
            (User.email == "aryan@agriquene.gov.in")
        )
        .first()
    )
    if not aryan:
        aryan = User(
            username="ARYAN",
            full_name="Aryan",
            role=UserRole.MANDI_OFFICER,
            email="aryan@agriquene.gov.in",
            mobile_number="9811223302",
            hashed_password=get_password_hash("ASH@MI5T"),
            is_active=True
        )
        db.add(aryan)
        db.flush()
        aryan_buyer = Buyer(
            user_id=aryan.id,
            employee_id="STAFF-ARYAN",
            centre_id=centre_id,
            designation="Mandi Staff Officer",
            counter_number=2,
            is_active=True
        )
        db.add(aryan_buyer)
    else:
        aryan.username = "ARYAN"
        aryan.full_name = "Aryan"
        aryan.role = UserRole.MANDI_OFFICER
        aryan.hashed_password = get_password_hash("ASH@MI5T")
        aryan.is_active = True
        buyer_rec = db.query(Buyer).filter(Buyer.user_id == aryan.id).first()
        if not buyer_rec:
            buyer_rec = Buyer(
                user_id=aryan.id,
                employee_id="STAFF-ARYAN",
                centre_id=centre_id,
                designation="Mandi Staff Officer",
                counter_number=2,
                is_active=True
            )
            db.add(buyer_rec)
        else:
            buyer_rec.designation = "Mandi Staff Officer"
            buyer_rec.centre_id = centre_id
            buyer_rec.is_active = True

    db.commit()

def seed_initial_data(db: Session):
    # Ensure staff officers exist even if DB was already populated
    ensure_staff_officers(db)

    # Check if master data already exists
    if db.query(User).first() and db.query(Crop).first() and db.query(ProcurementCentre).first():
        return

    # If partial data exists from previous crash, clean it up
    if not db.query(User).first() and db.query(Crop).first():
        db.query(Crop).delete()
        db.query(ProcurementCentre).delete()
        db.commit()

    print("[AGRIQUENE DB] Initializing authentic Indian Mandi procurement master data...")

    # 1. Crops & MSP Master (Gov of India Official 2025-26 benchmarks)
    crops_data = [
        {"name": "Wheat (Sharbati/Kalyansona)", "hindi_name": "गेहूं", "msp": 2275.0, "std_m": 12.0, "max_m": 14.0, "bonus": 50.0, "season": "Rabi 2026"},
        {"name": "Paddy (Common Grade A)", "hindi_name": "धान (चावल)", "msp": 2183.0, "std_m": 14.0, "max_m": 17.0, "bonus": 40.0, "season": "Kharif 2026"},
        {"name": "Mustard / Rapeseed", "hindi_name": "सरसों", "msp": 5650.0, "std_m": 8.0, "max_m": 10.0, "bonus": 100.0, "season": "Rabi 2026"},
        {"name": "Maize (Makka)", "hindi_name": "मक्का", "msp": 2090.0, "std_m": 13.0, "max_m": 15.0, "bonus": 30.0, "season": "Kharif 2026"},
        {"name": "Cotton (Medium Staple)", "hindi_name": "कपास", "msp": 6620.0, "std_m": 8.5, "max_m": 12.0, "bonus": 120.0, "season": "Kharif 2026"},
        {"name": "Soybean (Yellow)", "hindi_name": "सोयाबीन", "msp": 4600.0, "std_m": 10.0, "max_m": 12.0, "bonus": 75.0, "season": "Kharif 2026"},
        {"name": "Gram / Chana", "hindi_name": "चना", "msp": 5440.0, "std_m": 10.0, "max_m": 12.0, "bonus": 80.0, "season": "Rabi 2026"}
    ]
    
    crops = []
    for c in crops_data:
        crop_obj = Crop(
            name=c["name"],
            hindi_name=c["hindi_name"],
            msp_per_quintal=c["msp"],
            standard_moisture_pct=c["std_m"],
            max_moisture_pct=c["max_m"],
            grade_a_premium=c["bonus"],
            season=c["season"],
            is_active=True
        )
        db.add(crop_obj)
        crops.append(crop_obj)
    db.commit()

    # 2. Procurement Centres (Mandis / APMCs across India)
    from .seed_india_mandis import INDIA_MANDIS
    centres_data = INDIA_MANDIS

    centres = []
    for c in centres_data:
        centre_obj = ProcurementCentre(
            name=c["name"],
            code=c["code"],
            address=c["address"],
            district=c["district"],
            state=c["state"],
            pin_code=c.get("pin_code", c.get("pin", "110001")),
            latitude=c.get("latitude", c.get("lat")),
            longitude=c.get("longitude", c.get("lng")),
            contact_phone=c.get("contact_phone", "1800-180-1551"),
            capacity_per_day=c.get("capacity_per_day", c.get("capacity", 200)),
            active_counters=c.get("active_counters", 4),
            total_counters=c.get("total_counters", 6),
            avg_processing_time_min=c.get("avg_processing_time_min", c.get("avg_proc", 8.0)),
            workload_pct=c.get("workload_pct", c.get("workload", 65.0)),
            open_time=c.get("open_time", "08:00 AM"),
            close_time=c.get("close_time", "06:00 PM"),
            status=c.get("status", CentreStatus.OPEN),
        )
        db.add(centre_obj)
        centres.append(centre_obj)
    db.commit()

    # 3. Slots for today & next 3 days
    today_str = datetime.now().strftime("%Y-%m-%d")
    tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    day_after_str = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    
    time_slots = [
        ("08:00 AM", "09:30 AM", 25, 0, False),
        ("09:30 AM", "11:00 AM", 25, 0, False),
        ("11:00 AM", "12:30 PM", 25, 0, True),
        ("12:30 PM", "02:00 PM", 30, 0, True),
        ("02:00 PM", "03:30 PM", 25, 0, False),
        ("03:30 PM", "05:00 PM", 25, 0, False)
    ]
    
    for centre in centres:
        for date_str in [today_str, tomorrow_str, day_after_str]:
            for start, end, cap, booked, rec in time_slots:
                slot = Slot(
                    centre_id=centre.id,
                    date=date_str,
                    start_time=start,
                    end_time=end,
                    capacity=cap,
                    booked_count=booked,
                    is_recommended=rec,
                    is_active=True
                )
                db.add(slot)
    db.commit()

    # 4. Standard System Users
    # A) Pre-registered Farmer User (Ramesh Kumar Sharma)
    farmer_user = User(
        mobile_number="9876543210",
        email="ramesh.farmer@agriquene.gov.in",
        full_name="Ramesh Kumar Sharma",
        role=UserRole.FARMER,
        hashed_password=get_password_hash("farmer123"),
        is_active=True
    )
    db.add(farmer_user)
    db.flush()

    farmer_profile = Farmer(
        user_id=farmer_user.id,
        farmer_id_card="PMK-UP-2026-9481",
        father_name="Late Shri Ram Gopal Sharma",
        address="Village Muradnagar, Block Bhojpur, Tehsil Modinagar",
        village="Muradnagar",
        district="Ghaziabad",
        state="Uttar Pradesh",
        pin_code="201206",
        land_acres=4.5,
        bank_account_masked="•••• •••• 4921",
        bank_name="State Bank of India",
        ifsc_code="SBIN0001234",
        preferred_crop="Wheat (Sharbati/Kalyansona)"
    )
    db.add(farmer_profile)

    # B) Procurement Officer / Staff User
    buyer_user = User(
        mobile_number="9811223344",
        email="rajesh.buyer@agriquene.gov.in",
        full_name="Rajesh Verma (Procurement Officer)",
        role=UserRole.BUYER,
        hashed_password=get_password_hash("buyer123"),
        is_active=True
    )
    db.add(buyer_user)
    db.flush()

    buyer_profile = Buyer(
        user_id=buyer_user.id,
        employee_id="BUYER-GZB-01",
        centre_id=centres[0].id,
        designation="Senior Procurement Officer",
        counter_number=1,
        is_active=True
    )
    db.add(buyer_profile)

    # C) System Administrator (State Director)
    admin_user = User(
        mobile_number="9800000001",
        email="admin@agriquene.gov.in",
        full_name="Dr. S. K. Awasthi (Director Food & Civil Supplies)",
        role=UserRole.ADMIN,
        hashed_password=get_password_hash("admin123"),
        is_active=True
    )
    db.add(admin_user)
    db.flush()

    admin_profile = Admin(
        user_id=admin_user.id,
        employee_id="ADMIN-ND-001",
        department="Department of Food & Public Distribution",
        access_level="STATE_DIRECTOR"
    )
    db.add(admin_profile)

    # D) Configured State Administrator Ashmit
    ashmit_user = User(
        mobile_number="9800002751",
        email="s24cseu2751@bennett.edu.in",
        full_name="Ashmit (State Administrator)",
        role=UserRole.ADMIN,
        hashed_password=get_password_hash("ASH@MI5T"),
        is_active=True
    )
    db.add(ashmit_user)
    db.flush()

    ashmit_admin = Admin(
        user_id=ashmit_user.id,
        employee_id="s24cseu2751@bennett.edu.in",
        department="Department of Food & Public Distribution",
        access_level="STATE_DIRECTOR"
    )
    db.add(ashmit_admin)
    db.commit()

    print("[AGRIQUENE DB] Database initialized with master data (Crops, APMC Mandis, Slots, Admin, Staff). Active queue is clean and dynamic.")
