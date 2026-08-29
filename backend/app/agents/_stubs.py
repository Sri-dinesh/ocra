"""Temporary domain stubs for independent development.
Matches Charan's future connector & geospatial signatures exactly.
Deleted/swapped at merge time (see §6.3 of Lead Doc).
"""

from typing import Dict, Any, Optional, List


async def stub_fetch_ocean_data(
    lat: float, lon: float, time_window: Optional[str] = None
) -> Dict[str, Any]:
    """Stub matching app.geospatial.fusion.fuse(lat, lon, time_window)"""
    return {
        "lat": lat,
        "lon": lon,
        "valid_time": "2026-08-29T06:00:00+05:30",
        "fetched_at": "2026-08-28T22:10:00+05:30",
        "sst_c": 28.2,
        "chl_a_mgm3": 1.4,
        "wave_height_m": 1.8,
        "wind_speed_kt": 14.0,
        "current_speed_ms": 0.45,
        "current_dir_deg": 120.0,
        "source_map": {
            "sst_c": "Copernicus CMEMS",
            "wave_height_m": "INCOIS OSF",
            "wind_speed_kt": "INCOIS OSF",
        },
        "quality": "good",
    }


async def stub_fetch_weather_hazard(
    lat: float, lon: float, time_window: Optional[str] = None
) -> Dict[str, Any]:
    """Stub matching app.connectors.imd_bulletin.fetch(lat, lon, time_window)"""
    # Returns simulated active hazards; empty list when clear
    return {
        "hazards": [],
        "has_cyclone": False,
        "highest_severity": "low",
        "bulletin_text": "No active cyclone or severe gale warning for this coastal sector.",
        "source": "IMD",
        "fetched_at": "2026-08-28T21:00:00+05:30",
    }


async def stub_check_geofence(lat: float, lon: float) -> Dict[str, Any]:
    """Stub matching app.geospatial.geofence.check_point(lat, lon)"""
    return {
        "zones": [],
        "is_inside_restricted": False,
        "distance_to_imbl_nm": 42.6,
        "nearest_boundary": "IMBL_Segment_04",
        "source": "INCOIS/PostGIS",
    }
