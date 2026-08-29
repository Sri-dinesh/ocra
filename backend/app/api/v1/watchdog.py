from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.models.vessel import Vessel

router = APIRouter()

class SubscribeRequest(BaseModel):
    label: str
    lat: float
    lon: float

class SubscribeResponse(BaseModel):
    vessel_id: str
    message: str

@router.post("/watchdog/subscribe", response_model=SubscribeResponse)
def subscribe_vessel(req: SubscribeRequest, db: Session = Depends(get_db)):
    vessel = Vessel(
        label=req.label,
        lat=req.lat,
        lon=req.lon
    )
    db.add(vessel)
    db.commit()
    db.refresh(vessel)
    
    return SubscribeResponse(
        vessel_id=str(vessel.id),
        message="Vessel subscribed to watchdog polling successfully."
    )
