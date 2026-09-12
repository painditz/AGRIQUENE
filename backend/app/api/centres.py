import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models.models import ProcurementCentre, Slot, Token, TokenStatus, CentreStatus
from ..schemas.schemas import CentreResponse, SlotResponse, CentreQueueStatusResponse, QueueItem
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
