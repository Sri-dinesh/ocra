"""Production-Grade Ocean State & Offline Sync API Handlers.
Features:
- Fused environmental observation lookup (SST, chlorophyll, waves, winds, currents).
- Compact offline edge synchronization payload generator.
Owner: CHARAN / Backend-B (Hardened for Akash Mobile Integration)
"""

from typing import Optional
import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.oceanstate import OceanStateResponse, SyncPayloadResponse
from app.geospatial.fusion import fuse
from app.db.session import get_db
from app.db.repositories.ocean_state_repository import get_nearest

router = APIRouter(tags=["OceanState"])


@router.get("/oceanstate", response_model=OceanStateResponse, summary="Get Fused Ocean Environmental State")
def get_ocean_state(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    time: Optional[datetime.datetime] = Query(None, description="Optional target ISO timestamp, defaults to now"),
    db: Session = Depends(get_db),
):
    target_time = time or datetime.datetime.now(datetime.timezone.utc)
    
    # Try to get from cache/DB first
    try:
        cached = get_nearest(db, lat, lon, target_time)
        if cached and hasattr(cached, "valid_time") and cached.valid_time:
            cv_time = cached.valid_time
            if cv_time.tzinfo is None:
                cv_time = cv_time.replace(tzinfo=datetime.timezone.utc)
            t_time = target_time
            if t_time.tzinfo is None:
                t_time = t_time.replace(tzinfo=datetime.timezone.utc)
                
            if abs((cv_time - t_time).total_seconds()) < 3600:
                return OceanStateResponse(
                    lat=cached.lat,
                    lon=cached.lon,
                    valid_time=cached.valid_time,
                    sst_c=cached.sst_c,
                    chl_a_mgm3=cached.chl_a_mgm3,
                    wave_height_m=cached.wave_height_m,
                    wind_speed_kt=cached.wind_speed_kt,
                    current_speed_ms=cached.current_speed_ms,
                    current_dir_deg=cached.current_dir_deg,
                    source_map={
                        "sst_c": cached.sst_source.display_name if cached.sst_source else "Copernicus Marine Environment Monitoring Service",
                        "wave_height_m": cached.wave_source.display_name if cached.wave_source else "INCOIS Ocean State Forecast",
                        "wind_speed_kt": cached.wind_source.display_name if cached.wind_source else "INCOIS Ocean State Forecast",
                    },
                    quality=cached.quality or "good",
                )
    except Exception:
        pass
        
    # Run live physical fusion engine
    fused_state = fuse(lat, lon, target_time)
    return OceanStateResponse(**fused_state)


@router.get("/sync/payload", response_model=SyncPayloadResponse, summary="Get Compact Offline Edge Synchronization Payload")
def get_sync_payload(
    cell: str = Query(..., description="lat,lon format e.g. 16.98,82.24"),
    db: Session = Depends(get_db),
):
    lat_str, lon_str = cell.split(",")
    lat, lon = float(lat_str), float(lon_str)
    
    now = datetime.datetime.now(datetime.timezone.utc)
    fused_state = fuse(lat, lon, now)
    
    return SyncPayloadResponse(
        v=1,
        t=now.isoformat(),
        cell={"lat": lat, "lon": lon},
        wave_m=fused_state.get("wave_height_m"),
        wind_kt=fused_state.get("wind_speed_kt"),
        sst_c=fused_state.get("sst_c"),
        hazards=[],
    )
