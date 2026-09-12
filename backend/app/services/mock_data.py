from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models.models import (
    User, Farmer, Buyer, Admin, UserRole,
    ProcurementCentre, CentreStatus, Crop, Slot,
    Booking, Token, TokenStatus, BookingStatus,
    QueueEntry, ProcurementRecord, Payment, PaymentStatus,
    Notification, SMSLog
)
from ..core.security import get_password_hash

def seed_initial_data(db: Session):
    # Check if data already exists
    if db.query(User).first() and db.query(Crop).first() and db.query(Token).first():
        return

    # If partial data exists from previous crash, clean it up
    if not db.query(User).first() and db.query(Crop).first():
        db.query(Crop).delete()
        db.query(ProcurementCentre).delete()
        db.commit()

    print("[AGRIQUENE DB] Seeding authentic Indian Mandi procurement master data...")

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

    # 2. Procurement Centres (Mandis / APMCs)
    centres_data = [
        {
            "name": "Agri Procurement Centre – Ghaziabad Mandi",
            "code": "APC-UP-GZB-01",
            "address": "Grand Trunk Road, Near New Bus Stand, Ghaziabad",
            "district": "Ghaziabad",
            "state": "Uttar Pradesh",
            "pin": "201001",
            "lat": 28.6692,
            "lng": 77.4538,
            "capacity": 180,
            "active_counters": 4,
            "total_counters": 6,
            "avg_proc": 8.0,
            "workload": 75.0,
            "status": CentreStatus.OPEN
        },
        {
            "name": "Karnal Central Grain APMC Mandi",
            "code": "APC-HR-KNL-02",
            "address": "Sector 3, APMC Yard, GT Road, Karnal",
            "district": "Karnal",
            "state": "Haryana",
            "pin": "132001",
            "lat": 29.6857,
            "lng": 76.9905,
            "capacity": 220,
            "active_counters": 5,
            "total_counters": 8,
            "avg_proc": 7.5,
            "workload": 60.0,
            "status": CentreStatus.OPEN
        },
        {
            "name": "Jaipur Krishi Upaj Mandi Samiti (Muhana)",
            "code": "APC-RJ-JPR-03",
            "address": "Muhana Mandi Complex, Sanganer, Jaipur",
            "district": "Jaipur",
            "state": "Rajasthan",
            "pin": "302029",
            "lat": 26.8124,
            "lng": 75.7683,
            "capacity": 160,
            "active_counters": 3,
            "total_counters": 5,
            "avg_proc": 9.0,
            "workload": 82.0,
            "status": CentreStatus.BUSY
        },
        {
            "name": "Ludhiana Dana Mandi (Gill Road)",
            "code": "APC-PB-LDH-04",
            "address": "Gill Road Market Yard, Ludhiana",
            "district": "Ludhiana",
            "state": "Punjab",
            "pin": "141003",
            "lat": 30.9010,
            "lng": 75.8573,
            "capacity": 250,
            "active_counters": 6,
            "total_counters": 8,
            "avg_proc": 7.0,
            "workload": 50.0,
            "status": CentreStatus.OPEN
        },
        {
            "name": "Bhopal Karond Krishi Mandi",
            "code": "APC-MP-BPL-05",
            "address": "Karond Mandi Bypass, Berasia Road, Bhopal",
            "district": "Bhopal",
            "state": "Madhya Pradesh",
            "pin": "462038",
            "lat": 23.2982,
            "lng": 77.4085,
            "capacity": 140,
            "active_counters": 3,
            "total_counters": 4,
            "avg_proc": 8.5,
            "workload": 45.0,
            "status": CentreStatus.OPEN
        }
    ]

    centres = []
    for c in centres_data:
        centre_obj = ProcurementCentre(
            name=c["name"],
            code=c["code"],
            address=c["address"],
            district=c["district"],
            state=c["state"],
            pin_code=c["pin"],
            latitude=c["lat"],
            longitude=c["lng"],
            contact_phone="1800-180-1551",
            capacity_per_day=c["capacity"],
            active_counters=c["active_counters"],
            total_counters=c["total_counters"],
            avg_processing_time_min=c["avg_proc"],
            workload_pct=c["workload"],
            open_time="08:00 AM",
            close_time="06:00 PM",
            status=c["status"]
        )
        db.add(centre_obj)
        centres.append(centre_obj)
    db.commit()

    # 3. Slots for today & next 3 days
    today_str = datetime.now().strftime("%Y-%m-%d")
    tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    day_after_str = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    
    time_slots = [
        ("08:00 AM", "09:30 AM", 25, 25, False), # Full
        ("09:30 AM", "11:00 AM", 25, 22, False), # 3 slots left
        ("11:00 AM", "12:30 PM", 25, 18, True),  # Recommended (7 left)
        ("12:30 PM", "02:00 PM", 30, 14, True),  # Recommended (16 left)
        ("02:00 PM", "03:30 PM", 25, 10, False), # 15 left
        ("03:30 PM", "05:00 PM", 25, 5, False)   # 20 left
    ]
    
    slots_map = {}
    for centre in centres:
        for date_str in [today_str, tomorrow_str, day_after_str]:
            for start, end, cap, booked, rec in time_slots:
                # Add some variation per centre
                b_count = booked if date_str == today_str else (booked // 2)
                slot = Slot(
                    centre_id=centre.id,
                    date=date_str,
                    start_time=start,
                    end_time=end,
                    capacity=cap,
                    booked_count=b_count,
                    is_recommended=rec,
                    is_active=True
                )
                db.add(slot)
                db.flush()
                slots_map[(centre.id, date_str, start)] = slot
    db.commit()

    # 4. Create Users (Demo Farmer, Demo Buyer, Demo Admin)
    # A) Demo Farmer
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
        bank_account_masked="XXXX-XXXX-4921",
        ifsc_code="SBIN0001234",
        preferred_crop="Wheat (Sharbati/Kalyansona)"
    )
    db.add(farmer_profile)

    # B) Additional Demo Farmers for the queue
    queue_farmer_names = [
        ("Suresh Yadav", "9876500001", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 42.0),
        ("Harpreet Singh Dhillon", "9876500002", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 55.0),
        ("Mahipal Singh", "9876500003", "Ghaziabad", "Mustard / Rapeseed", 28.0),
        ("Rajendra Prasad", "9876500004", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 36.0),
        ("Baldev Ram", "9876500005", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 50.0),
        ("Satpal Tyagi", "9876500006", "Ghaziabad", "Mustard / Rapeseed", 30.0),
        ("Dharmendra Singh", "9876500007", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 45.0),
        ("Kishan Lal", "9876500008", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 38.0),
        ("Om Prakash", "9876500009", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 62.0),
        ("Manoj Chaudhary", "9876500010", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 40.0),
        ("Praveen Kumar", "9876500011", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 35.0),
        ("Devendra Sharma", "9876500012", "Ghaziabad", "Mustard / Rapeseed", 25.0),
        ("Virender Singh", "9876500013", "Ghaziabad", "Wheat (Sharbati/Kalyansona)", 48.0),
    ]

    queue_farmers = []
    for fn, mob, dist, crp, qty in queue_farmer_names:
        u = User(
            mobile_number=mob,
            full_name=fn,
            role=UserRole.FARMER,
            hashed_password=get_password_hash("farmer123")
        )
        db.add(u)
        db.flush()
        fp = Farmer(
            user_id=u.id,
            farmer_id_card=f"PMK-UP-2026-{mob[-4:]}",
            father_name=f"Shri Ram {fn.split()[0]}",
            village="Niwari",
            district=dist,
            state="Uttar Pradesh",
            land_acres=3.0,
            preferred_crop=crp
        )
        db.add(fp)
        queue_farmers.append((fp, crp, qty))

    # C) Demo Buyer / Staff User
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
        centre_id=centres[0].id, # Ghaziabad Mandi
        designation="Senior Procurement Officer",
        counter_number=1,
        is_active=True
    )
    db.add(buyer_profile)

    # D) Demo Admin User
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
    db.commit()

    # 5. Populate Active Queue at Ghaziabad Mandi:
    # Token 114 is currently SERVING at Counter 1
    # Tokens 115 - 127 are WAITING (13 farmers ahead)
    # Token 128 is DEMO FARMER Ramesh Kumar Sharma (Position 14)
    target_centre = centres[0]
    target_slot = slots_map.get((target_centre.id, today_str, "11:00 AM")) or list(slots_map.values())[0]
    
    # Token #114 (Currently SERVING)
    b_serv = Booking(
        booking_reference="AGQ-2026-GZB-114",
        farmer_id=queue_farmers[0][0].id,
        centre_id=target_centre.id,
        slot_id=target_slot.id,
        crop_type="Wheat (Sharbati/Kalyansona)",
        estimated_quantity_quintals=40.0,
        status=BookingStatus.CONFIRMED,
        booking_date=today_str
    )
    db.add(b_serv)
    db.flush()

    t_serv = Token(
        token_number=114,
        token_display="#114",
        booking_id=b_serv.id,
        farmer_id=queue_farmers[0][0].id,
        centre_id=target_centre.id,
        slot_id=target_slot.id,
        status=TokenStatus.PROCESSING,
        current_position=0,
        initial_position=1,
        called_at=datetime.utcnow() - timedelta(minutes=6),
        started_at=datetime.utcnow() - timedelta(minutes=4)
    )
    db.add(t_serv)
    db.flush()

    q_serv = QueueEntry(
        centre_id=target_centre.id,
        token_id=t_serv.id,
        position=0,
        counter_assigned=1,
        is_active=True
    )
    db.add(q_serv)

    # Tokens #115 - #127 (Farmers ahead in waiting list)
    for idx in range(1, 14):
        t_num = 114 + idx
        farmer_item = queue_farmers[idx % len(queue_farmers)]
        f_p, f_crop, f_qty = farmer_item
        
        b = Booking(
            booking_reference=f"AGQ-2026-GZB-{t_num}",
            farmer_id=f_p.id,
            centre_id=target_centre.id,
            slot_id=target_slot.id,
            crop_type=f_crop,
            estimated_quantity_quintals=f_qty,
            status=BookingStatus.CONFIRMED,
            booking_date=today_str
        )
        db.add(b)
        db.flush()

        tok = Token(
            token_number=t_num,
            token_display=f"#{t_num}",
            booking_id=b.id,
            farmer_id=f_p.id,
            centre_id=target_centre.id,
            slot_id=target_slot.id,
            status=TokenStatus.WAITING,
            current_position=idx,
            initial_position=idx
        )
        db.add(tok)
        db.flush()

        qe = QueueEntry(
            centre_id=target_centre.id,
            token_id=tok.id,
            position=idx,
            is_active=True
        )
        db.add(qe)

    # Token #128 - TARGET DEMO FARMER (Ramesh Kumar Sharma)
    # Position: 14, AI Estimated Wait: 47 minutes, Expected Turn: ~11:42 AM
    b_demo = Booking(
        booking_reference="AGQ-2026-GZB-128",
        farmer_id=farmer_profile.id,
        centre_id=target_centre.id,
        slot_id=target_slot.id,
        crop_type="Wheat (Sharbati/Kalyansona)",
        estimated_quantity_quintals=45.0,
        status=BookingStatus.CONFIRMED,
        booking_date=today_str
    )
    db.add(b_demo)
    db.flush()

    t_demo = Token(
        token_number=128,
        token_display="#128",
        booking_id=b_demo.id,
        farmer_id=farmer_profile.id,
        centre_id=target_centre.id,
        slot_id=target_slot.id,
        status=TokenStatus.WAITING,
        current_position=14,
        initial_position=14
    )
    db.add(t_demo)
    db.flush()

    qe_demo = QueueEntry(
        centre_id=target_centre.id,
        token_id=t_demo.id,
        position=14,
        is_active=True
    )
    db.add(qe_demo)

    # 6. Seed Historical Procurements & Completed Payments for Ramesh Kumar Sharma
    prev_date = (datetime.now() - timedelta(days=120)).strftime("%Y-%m-%d")
    b_prev = Booking(
        booking_reference="AGQ-2025-GZB-089",
        farmer_id=farmer_profile.id,
        centre_id=target_centre.id,
        slot_id=target_slot.id,
        crop_type="Paddy (Common Grade A)",
        estimated_quantity_quintals=60.0,
        status=BookingStatus.COMPLETED,
        booking_date=prev_date
    )
    db.add(b_prev)
    db.flush()

    t_prev = Token(
        token_number=89,
        token_display="#89",
        booking_id=b_prev.id,
        farmer_id=farmer_profile.id,
        centre_id=target_centre.id,
        slot_id=target_slot.id,
        status=TokenStatus.COMPLETED,
        current_position=0,
        completed_at=datetime.utcnow() - timedelta(days=120)
    )
    db.add(t_prev)
    db.flush()

    proc_prev = ProcurementRecord(
        token_id=t_prev.id,
        farmer_id=farmer_profile.id,
        centre_id=target_centre.id,
        buyer_id=buyer_profile.id,
        crop_name="Paddy (Common Grade A)",
        gross_weight_quintals=62.4,
        tare_weight_quintals=2.4,
        net_weight_quintals=60.0,
        moisture_pct=13.2,
        quality_grade="Grade A (FAQ)",
        base_msp=2183.0,
        bonus_amount=2400.0,
        total_amount=(60.0 * 2183.0) + 2400.0,
        receipt_number="RCPT-GZB-2025-089",
        status="COMPLETED",
        verified_at=datetime.utcnow() - timedelta(days=120)
    )
    db.add(proc_prev)
    db.flush()

    pay_prev = Payment(
        procurement_id=proc_prev.id,
        farmer_id=farmer_profile.id,
        transaction_ref="DBT-PFMS-20251114-884920",
        amount=proc_prev.total_amount,
        payment_mode="Direct Benefit Transfer (PFMS / Aadhaar DBT)",
        status=PaymentStatus.COMPLETED,
        bank_account_masked=farmer_profile.bank_account_masked,
        bank_name="State Bank of India",
        utr_number="SBIN202511149928172",
        initiated_at=datetime.utcnow() - timedelta(days=120),
        completed_at=datetime.utcnow() - timedelta(days=119)
    )
    db.add(pay_prev)

    # 7. Initial Notifications & SMS Logs
    notif1 = Notification(
        user_id=farmer_user.id,
        title="Procurement Booking Confirmed",
        message="Your slot at Agri Procurement Centre – Ghaziabad Mandi is confirmed. Token #128 generated.",
        type="BOOKING",
        created_at=datetime.utcnow() - timedelta(minutes=45)
    )
    notif2 = Notification(
        user_id=farmer_user.id,
        title="Live Queue Active",
        message="Currently Token #114 is being served. 14 farmers ahead of you. AI Estimated Wait: 47 minutes.",
        type="QUEUE",
        created_at=datetime.utcnow() - timedelta(minutes=20)
    )
    db.add(notif1)
    db.add(notif2)

    sms1 = SMSLog(
        mobile_number="9876543210",
        message="[AGRIQUENE-GOV] Token #128 confirmed at Agri Procurement Centre - Ghaziabad Mandi. Est. wait: 47 min. Expected turn: 11:42 AM. Track live at agriquene.gov.in",
        trigger_event="TOKEN_GENERATED",
        status="SENT",
        sent_at=datetime.utcnow() - timedelta(minutes=45)
    )
    sms2 = SMSLog(
        mobile_number="9876543210",
        message="[AGRIQUENE-GOV] Queue update for #128: 14 farmers ahead. Est. wait: 47 min. Departure advisory: Plan to leave around 11:00 AM.",
        trigger_event="QUEUE_MOVEMENT",
        status="SENT",
        sent_at=datetime.utcnow() - timedelta(minutes=20)
    )
    db.add(sms1)
    db.add(sms2)

    db.commit()
    print("[AGRIQUENE DB] Successfully initialized database with demo mandi records & Token #128 at Position 14!")
