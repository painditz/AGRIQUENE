import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models.models import ProcurementCentre, Slot, Token, TokenStatus, CentreStatus
from ..schemas.schemas import CentreResponse, SlotResponse, CentreQueueStatusResponse, QueueItem, LocationSearchResult
from ..services.eta_service import eta_service

router = APIRouter(prefix="/centres", tags=["Procurement Centres"])

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

@router.get("", response_model=List[CentreResponse])
def list_centres(
    district: Optional[str] = None,
    state: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
    radius_km: Optional[float] = None,
    include_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProcurementCentre)
    if district:
        query = query.filter(ProcurementCentre.district.ilike(f"%{district}%"))
    if state:
        query = query.filter(ProcurementCentre.state.ilike(f"%{state}%"))
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (ProcurementCentre.name.ilike(s)) |
            (ProcurementCentre.district.ilike(s)) |
            (ProcurementCentre.state.ilike(s)) |
            (ProcurementCentre.address.ilike(s)) |
            (ProcurementCentre.code.ilike(s))
        )
        
    centres = query.all()
    results = []
    
    for c in centres:
        # Count currently waiting tokens
        waiting_count = (
            db.query(Token)
            .filter(Token.centre_id == c.id, Token.status == TokenStatus.WAITING)
            .count()
        )
        
        # Available slots
        available_slots = (
            db.query(Slot)
            .filter(Slot.centre_id == c.id, Slot.is_active == True)
            .all()
        )
        total_avail = sum(max(0, s.capacity - s.booked_count) for s in available_slots)
        
        # Calculate centre average wait time
        est_wait = max(5, int(round((waiting_count * c.avg_processing_time_min) / max(1, c.active_counters))))
        
        # Real Haversine distance if lat/lng are provided, otherwise None
        dist = _haversine(lat, lng, c.latitude, c.longitude) if (lat is not None and lng is not None) else None

        results.append(CentreResponse(
            id=c.id,
            name=c.name,
            code=c.code,
            address=c.address,
            district=c.district,
            state=c.state,
            pin_code=c.pin_code,
            latitude=c.latitude,
            longitude=c.longitude,
            contact_phone=c.contact_phone,
            capacity_per_day=c.capacity_per_day,
            active_counters=c.active_counters,
            total_counters=c.total_counters,
            avg_processing_time_min=c.avg_processing_time_min,
            workload_pct=c.workload_pct,
            open_time=c.open_time,
            close_time=c.close_time,
            status=c.status,
            current_waiting_count=waiting_count,
            estimated_wait_min=est_wait,
            available_slots_today=total_avail,
            distance_km=dist
        ))

    if lat is not None and lng is not None:
        results.sort(key=lambda x: x.distance_km if x.distance_km is not None else float("inf"))
        
        if radius_km is not None:
            results = [x for x in results if x.distance_km is not None and x.distance_km <= radius_km]

    # If limit is specified and include_id is given, ensure include_id is present
    if limit is not None and limit > 0:
        if include_id is not None:
            included_centre = next((x for x in results if x.id == include_id), None)
            top_results = [x for x in results if x.id != include_id][:limit - 1 if included_centre else limit]
            if included_centre:
                top_results.append(included_centre)
                # re-sort if distances exist
                if lat is not None and lng is not None:
                    top_results.sort(key=lambda x: x.distance_km if x.distance_km is not None else float("inf"))
            results = top_results
        else:
            results = results[:limit]

    return results

@router.get("/{centre_id}", response_model=CentreResponse)
def get_centre_detail(centre_id: int, db: Session = Depends(get_db)):
    c = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Procurement Centre not found")
        
    waiting_count = (
        db.query(Token)
        .filter(Token.centre_id == c.id, Token.status == TokenStatus.WAITING)
        .count()
    )
    
    slots = db.query(Slot).filter(Slot.centre_id == c.id, Slot.is_active == True).all()
    total_avail = sum(max(0, s.capacity - s.booked_count) for s in slots)
    est_wait = max(5, int(round((waiting_count * c.avg_processing_time_min) / max(1, c.active_counters))))

    return CentreResponse(
        id=c.id,
        name=c.name,
        code=c.code,
        address=c.address,
        district=c.district,
        state=c.state,
        pin_code=c.pin_code,
        latitude=c.latitude,
        longitude=c.longitude,
        contact_phone=c.contact_phone,
        capacity_per_day=c.capacity_per_day,
        active_counters=c.active_counters,
        total_counters=c.total_counters,
        avg_processing_time_min=c.avg_processing_time_min,
        workload_pct=c.workload_pct,
        open_time=c.open_time,
        close_time=c.close_time,
        status=c.status,
        current_waiting_count=waiting_count,
        estimated_wait_min=est_wait,
        available_slots_today=total_avail,
        distance_km=2.4
    )

@router.get("/{centre_id}/slots", response_model=List[SlotResponse])
def get_centre_slots(
    centre_id: int,
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Slot).filter(Slot.centre_id == centre_id, Slot.is_active == True)
    if date:
        query = query.filter(Slot.date == date)
    slots = query.all()
    
    return [
        SlotResponse(
            id=s.id,
            centre_id=s.centre_id,
            date=s.date,
            start_time=s.start_time,
            end_time=s.end_time,
            capacity=s.capacity,
            booked_count=s.booked_count,
            available_count=max(0, s.capacity - s.booked_count),
            is_recommended=s.is_recommended,
            is_active=s.is_active
        )
        for s in slots
    ]

@router.get("/locations/search", response_model=List[LocationSearchResult])
def search_locations(
    q: str = Query(..., min_length=2, description="Search term for village, town, district, or mandi"),
    db: Session = Depends(get_db)
):
    query_str = q.strip().lower()
    results: List[LocationSearchResult] = []
    seen_keys = set()

    # 1. Search existing Procurement Centres in Database
    centres = (
        db.query(ProcurementCentre)
        .filter(
            (ProcurementCentre.name.ilike(f"%{query_str}%")) |
            (ProcurementCentre.district.ilike(f"%{query_str}%")) |
            (ProcurementCentre.state.ilike(f"%{query_str}%")) |
            (ProcurementCentre.address.ilike(f"%{query_str}%"))
        )
        .limit(10)
        .all()
    )

    for c in centres:
        key = f"{c.name.lower()}-{c.district.lower()}"
        if key not in seen_keys:
            seen_keys.add(key)
            results.append(
                LocationSearchResult(
                    place_id=f"mandi-{c.id}",
                    display_name=f"{c.name}, {c.district}, {c.state}",
                    village=c.name.split("Mandi")[0].strip() if "Mandi" in c.name else c.name,
                    town=c.district,
                    district=c.district,
                    state=c.state,
                    pin_code=c.pin_code,
                    latitude=c.latitude,
                    longitude=c.longitude,
                    mandi_name=c.name,
                    centre_id=c.id
                )
            )

    # 2. Search predefined regional hubs & mandi towns from INDIA_MANDIS seed
    try:
        from ..services.seed_india_mandis import INDIA_MANDIS
        for m in INDIA_MANDIS:
            name_m = m.get("name", "")
            dist_m = m.get("district", "")
            state_m = m.get("state", "")
            addr_m = m.get("address", "")
            
            if (
                query_str in name_m.lower() or
                query_str in dist_m.lower() or
                query_str in state_m.lower() or
                query_str in addr_m.lower()
            ):
                key = f"{dist_m.lower()}-{name_m.lower()}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    results.append(
                        LocationSearchResult(
                            place_id=f"seed-{m.get('code', dist_m)}",
                            display_name=f"{name_m}, {dist_m}, {state_m}",
                            village=dist_m,
                            town=dist_m,
                            district=dist_m,
                            state=state_m,
                            pin_code=m.get("pin_code", "110001"),
                            latitude=float(m.get("latitude", 28.6139)),
                            longitude=float(m.get("longitude", 77.2090)),
                            mandi_name=name_m,
                            centre_id=None
                        )
                    )
            if len(results) >= 12:
                break
    except Exception:
        pass

    # 3. Dedicated common agricultural clusters & NCR towns
    common_towns = [
        {"name": "Muradnagar", "district": "Ghaziabad", "state": "Uttar Pradesh", "pin": "201206", "lat": 28.7752, "lng": 77.5034},
        {"name": "Modinagar", "district": "Ghaziabad", "state": "Uttar Pradesh", "pin": "201204", "lat": 28.8322, "lng": 77.5794},
        {"name": "Loni", "district": "Ghaziabad", "state": "Uttar Pradesh", "pin": "201102", "lat": 28.7515, "lng": 77.2882},
        {"name": "Govindpuram", "district": "Ghaziabad", "state": "Uttar Pradesh", "pin": "201013", "lat": 28.6823, "lng": 77.4912},
        {"name": "Narela", "district": "North Delhi", "state": "Delhi", "pin": "110040", "lat": 28.8529, "lng": 77.0945},
        {"name": "Najafgarh", "district": "South West Delhi", "state": "Delhi", "pin": "110043", "lat": 28.6092, "lng": 76.9854},
        {"name": "Bawana", "district": "North Delhi", "state": "Delhi", "pin": "110039", "lat": 28.7997, "lng": 77.0329},
        {"name": "Alipur", "district": "North Delhi", "state": "Delhi", "pin": "110036", "lat": 28.7998, "lng": 77.1328},
        {"name": "Ghazipur", "district": "East Delhi", "state": "Delhi", "pin": "110096", "lat": 28.6256, "lng": 77.3325},
        {"name": "Meerut City", "district": "Meerut", "state": "Uttar Pradesh", "pin": "250002", "lat": 28.9845, "lng": 77.7064},
        {"name": "Sardhana", "district": "Meerut", "state": "Uttar Pradesh", "pin": "250342", "lat": 29.1465, "lng": 77.6186},
        {"name": "Mawana", "district": "Meerut", "state": "Uttar Pradesh", "pin": "250401", "lat": 29.1021, "lng": 77.9228},
        {"name": "Baghpat", "district": "Baghpat", "state": "Uttar Pradesh", "pin": "250609", "lat": 28.9452, "lng": 77.2215},
        {"name": "Baraut", "district": "Baghpat", "state": "Uttar Pradesh", "pin": "250611", "lat": 29.1012, "lng": 77.2625},
        {"name": "Hapur", "district": "Hapur", "state": "Uttar Pradesh", "pin": "245101", "lat": 28.7306, "lng": 77.7759},
        {"name": "Garhmukteshwar", "district": "Hapur", "state": "Uttar Pradesh", "pin": "245205", "lat": 28.7845, "lng": 78.0934},
        {"name": "Karnal", "district": "Karnal", "state": "Haryana", "pin": "132001", "lat": 29.6857, "lng": 76.9905},
        {"name": "Panipat", "district": "Panipat", "state": "Haryana", "pin": "132103", "lat": 29.3909, "lng": 76.9635},
        {"name": "Sonipat", "district": "Sonipat", "state": "Haryana", "pin": "131001", "lat": 28.9931, "lng": 77.0151},
        {"name": "Kharkhoda", "district": "Sonipat", "state": "Haryana", "pin": "131402", "lat": 28.8785, "lng": 76.9125},
    ]

    for town in common_towns:
        t_name = town["name"].lower()
        t_dist = town["district"].lower()
        t_state = town["state"].lower()
        if query_str in t_name or query_str in t_dist or query_str in t_state:
            key = f"{town['name'].lower()}-{town['district'].lower()}"
            if key not in seen_keys:
                seen_keys.add(key)
                results.append(
                    LocationSearchResult(
                        place_id=f"cluster-{town['name'].lower()}",
                        display_name=f"{town['name']}, {town['district']}, {town['state']} (PIN: {town['pin']})",
                        village=town["name"],
                        town=town["name"],
                        district=town["district"],
                        state=town["state"],
                        pin_code=town["pin"],
                        latitude=town["lat"],
                        longitude=town["lng"],
                        mandi_name=None,
                        centre_id=None
                    )
                )

    return results

@router.get("/locations/reverse", response_model=LocationSearchResult)
def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db)
):
    """
    Reverse geocodes coordinates to find the closest mandi district/state in the database.
    """
    centres = db.query(ProcurementCentre).all()
    if not centres:
        return LocationSearchResult(
            place_id="current-loc",
            display_name="Your Location, India",
            village="Farm Location",
            town="Local District",
            district="National Capital Region",
            state="Delhi",
            pin_code="110001",
            latitude=lat,
            longitude=lng
        )

    closest_centre = None
    min_dist = float("inf")
    for c in centres:
        d = _haversine(lat, lng, c.latitude, c.longitude)
        if d < min_dist:
            min_dist = d
            closest_centre = c

    if closest_centre:
        return LocationSearchResult(
            place_id=f"rev-{closest_centre.id}",
            display_name=f"{closest_centre.district}, {closest_centre.state} (Near {closest_centre.name})",
            village=f"Near {closest_centre.name}",
            town=closest_centre.district,
            district=closest_centre.district,
            state=closest_centre.state,
            pin_code=closest_centre.pin_code,
            latitude=lat,
            longitude=lng,
            mandi_name=closest_centre.name,
            centre_id=closest_centre.id
        )

    return LocationSearchResult(
        place_id="current-loc",
        display_name="Your Location, India",
        village="Farm Location",
        town="Local District",
        district="National Capital Region",
        state="Delhi",
        pin_code="110001",
        latitude=lat,
        longitude=lng
    )
