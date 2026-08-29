from fastapi import APIRouter, Depends, Query
from app.schemas.oceanstate import OceanStateResponse, SyncPayloadResponse
from app.geospatial.fusion import fuse
from app.db.session import get_db
from app.db.repositories.ocean_state_repository import get_nearest
from sqlalchemy.orm import Session
import datetime
import math

router = APIRouter()

@router.get("/oceanstate", response_model=OceanStateResponse)
def get_ocean_state(
    lat: float, 
    lon: float, 
    time: datetime.datetime, 
    db: Session = Depends(get_db)
):
    # Try to get from cache/DB first
    cached = get_nearest(db, lat, lon, time)
    
    # Very basic cache check (e.g. within 1 hour)
    if cached and abs((cached.valid_time - time).total_seconds()) < 3600:
        return OceanStateResponse(
            lat=cached.lat,
            lon=cached.lon,
            valid_time=cached.valid_time,
            sst_c=cached.sst_c,
            chl_a_mgm3=cached.chl_a_mgm3,
            wave_height_m=cached.wave_height_m,
            wind_speed_kt=cached.wind_speed_kt,
            source_map=cached.source_map,
            quality=cached.quality
        )
        
    # Cache miss, run fusion
    fused_state = fuse(lat, lon, time)
    return OceanStateResponse(**fused_state)

@router.get("/sync/payload", response_model=SyncPayloadResponse)
def get_sync_payload(
    cell: str = Query(..., description="lat,lon format"),
    db: Session = Depends(get_db)
):
    lat_str, lon_str = cell.split(",")
    lat, lon = float(lat_str), float(lon_str)
    
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Try to get the latest state for this cell
    fused_state = fuse(lat, lon, now)
    
    # Construct compact payload
    return SyncPayloadResponse(
        v="1",
        t=now.isoformat(),
        cell=cell,
        wave_m=fused_state.get("wave_height_m"),
        wind_kt=fused_state.get("wind_speed_kt"),
        sst_c=fused_state.get("sst_c"),
        chl=fused_state.get("chl_a_mgm3"),
        hz=0, # Active hazards count
        imbl_nm=10.5 # Dummy distance for MVP
    )
