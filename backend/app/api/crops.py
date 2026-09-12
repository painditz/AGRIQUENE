from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models.models import Crop
from ..schemas.schemas import CropResponse

router = APIRouter(prefix="/crops", tags=["Crops"])

@router.get("", response_model=List[CropResponse])
def get_all_crops(db: Session = Depends(get_db)):
    """
    Returns all officially approved and active crops with MSP and moisture guidelines.
    Data is served dynamically from the government procurement database.
    """
    crops = db.query(Crop).filter(Crop.is_active == True).order_by(Crop.name.asc()).all()
    return crops

@router.get("/{crop_id}", response_model=CropResponse)
def get_crop_by_id(crop_id: int, db: Session = Depends(get_db)):
    crop = db.query(Crop).filter(Crop.id == crop_id, Crop.is_active == True).first()
    if not crop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop record not found"
        )
    return crop
