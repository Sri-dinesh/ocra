"""Production-Grade Domain Stubs for Sridinesh's Independent Reasoning Track.
Generates realistic, physically sound marine datasets tailored to geographic coastal regions in India.
Owner: SRIDINESH (Lead)
"""

import math
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta


async def stub_fetch_ocean_data(
    lat: float, lon: float, time_window: Optional[str] = None
) -> Dict[str, Any]:
    """Simulates high-fidelity INCOIS OSF / Copernicus CMEMS fused data."""
    now = datetime.now(timezone.utc)
    valid_time = (now + timedelta(hours=6)).isoformat()
    fetched_at = now.isoformat()

    # Regional variations based on coordinates
    # Bay of Bengal / East Coast (lat > 13, lon > 80)
    is_east_coast = lon > 78.0
    
    # Physics simulation heuristic
    base_sst = 28.5 if is_east_coast else 27.8
    sst_variation = 0.5 * math.sin(lat * 0.5)
    sst_c = round(base_sst + sst_variation, 1)
    
    # Wave heights: typical 1.2m - 2.4m along Indian coast
    wave_height_m = round(1.6 + 0.4 * math.cos(lat * 0.8), 1)
    wind_speed_kt = round(13.0 + 3.0 * math.sin(lon * 0.4), 1)
    chl_a_mgm3 = round(1.2 + 0.6 * math.sin(lat + lon), 2)
    swell_period_s = round(8.5 + 1.5 * math.cos(lat), 1)

    return {
        "lat": lat,
        "lon": lon,
        "valid_time": valid_time,
        "fetched_at": fetched_at,
        "sst_c": sst_c,
        "chl_a_mgm3": chl_a_mgm3,
        "wave_height_m": wave_height_m,
        "swell_period_s": swell_period_s,
        "swell_dir_deg": 140.0,
        "wind_speed_kt": wind_speed_kt,
        "wind_dir_deg": 180.0,
        "current_speed_ms": 0.45,
        "current_dir_deg": 115.0,
        "source_map": {
            "sst_c": "Copernicus CMEMS",
            "chl_a_mgm3": "NOAA ERDDAP",
            "wave_height_m": "INCOIS OSF",
            "wind_speed_kt": "INCOIS OSF",
            "swell_period_s": "INCOIS OSF",
        },
        "quality": "good",
    }


async def stub_fetch_weather_hazard(
    lat: float, lon: float, time_window: Optional[str] = None
) -> Dict[str, Any]:
    """Simulates IMD meteorological hazard bulletins."""
    now = datetime.now(timezone.utc)
    
    return {
        "hazards": [],
        "has_cyclone": False,
        "highest_severity": "low",
        "cyclone_category": None,
        "bulletin_text": "No active cyclone or severe gale advisory for this coastal sector.",
        "source": "IMD",
        "fetched_at": now.isoformat(),
    }


async def stub_check_geofence(lat: float, lon: float) -> Dict[str, Any]:
    """Simulates PostGIS spatial containment and IMBL distance calculation."""
    # Distance to IMBL heuristic (closer to Palk Bay / 79E / 9N)
    dist_imbl = 42.6
    if 8.5 <= lat <= 10.5 and 78.5 <= lon <= 80.0:
        # Palk Strait / Gulf of Mannar region
        dist_imbl = max(1.2, round(abs(lon - 79.5) * 60.0 * 0.6, 1))

    return {
        "zones": [],
        "distance_to_imbl_nm": dist_imbl,
        "nearest_boundary_name": "IMBL_TamilNadu_SriLanka_Sector",
        "is_inside_restricted": False,
        "restricted_zone_names": [],
        "source": "INCOIS/PostGIS",
    }
