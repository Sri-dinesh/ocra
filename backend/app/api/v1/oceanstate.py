"""GET /api/v1/oceanstate and GET /api/v1/sync/payload handlers.
Owner: CHARAN (Backend-B)
"""

from fastapi import APIRouter, Query
from app.schemas.oceanstate import OceanStateResponse, SyncPayloadResponse, HazardSummary

router = APIRouter(tags=["Ocean State"])


@router.get("/oceanstate", response_model=OceanStateResponse)
async def get_ocean_state(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    time: str = Query(default="2026-08-29T06:00:00+05:30", description="ISO8601 timestamp"),
) -> OceanStateResponse:
    """Retrieve fused marine observation & forecast state."""
    return OceanStateResponse(
        lat=lat,
        lon=lon,
        valid_time=time,
        sst_c=28.2,
        chl_a_mgm3=1.4,
        wave_height_m=1.8,
        wind_speed_kt=14.0,
        source_map={
            "sst_c": "Copernicus CMEMS",
            "wave_height_m": "INCOIS OSF",
        },
        quality="good",
    )


@router.get("/sync/payload", response_model=SyncPayloadResponse)
async def get_sync_payload(
    cell: str = Query(..., description="Cell coordinates as 'lat,lon'"),
) -> SyncPayloadResponse:
    """Compact payload for mobile offline cache."""
    try:
        lat_str, lon_str = cell.split(",")
        lat, lon = float(lat_str), float(lon_str)
    except Exception:
        lat, lon = 16.9891, 82.2475

    return SyncPayloadResponse(
        v=1,
        t="2026-08-29T06:00:00+05:30",
        cell={"lat": lat, "lon": lon},
        wave_m=1.8,
        wind_kt=14.0,
        sst_c=28.2,
        chl=1.4,
        hz=[],
        imbl_nm=42.6,
    )
