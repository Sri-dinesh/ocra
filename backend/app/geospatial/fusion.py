import logging
import datetime
from app.connectors.copernicus import CopernicusConnector
from app.connectors.incois_osf import IncoisOsfConnector
from app.connectors.noaa_erddap import NoaaErddapConnector
from app.db.session import SessionLocal
from app.db.repositories.ocean_state_repository import insert_ocean_state

logger = logging.getLogger(__name__)

copernicus = CopernicusConnector()
incois_osf = IncoisOsfConnector()
noaa = NoaaErddapConnector()

def fuse(lat: float, lon: float, time_window: datetime.datetime) -> dict:
    """Calls relevant connectors and normalizes outputs into an OceanState dict."""
    logger.info(f"Fusing marine state for {lat}, {lon} at {time_window}")
    
    c_data = copernicus.fetch(lat, lon, time_window) or {}
    i_data = incois_osf.fetch(lat, lon, time_window) or {}
    n_data = noaa.fetch(lat, lon, time_window) or {}
    
    state_dict = {
        "lat": lat,
        "lon": lon,
        "valid_time": time_window,
        "sst_c": c_data.get("sst_c"),
        "chl_a_mgm3": n_data.get("chl_a_mgm3"),
        "wave_height_m": i_data.get("wave_height_m"),
        "wind_speed_kt": i_data.get("wind_speed_kt"),
        "current_speed_ms": c_data.get("current_speed_ms"),
        "current_dir_deg": c_data.get("current_dir_deg"),
        "source_map": {
            "sst_c": "Copernicus" if c_data.get("sst_c") else None,
            "chl_a_mgm3": "NOAA ERDDAP" if n_data.get("chl_a_mgm3") else None,
            "wave_height_m": "INCOIS OSF" if i_data.get("wave_height_m") else None,
            "wind_speed_kt": "INCOIS OSF" if i_data.get("wind_speed_kt") else None
        },
        "quality": "good" # Simple fallback quality
    }
    
    # Remove None values from source_map
    state_dict["source_map"] = {k: v for k, v in state_dict["source_map"].items() if v is not None}
    
    db = SessionLocal()
    try:
        # Persist the state
        insert_ocean_state(db, state_dict)
    except Exception as e:
        logger.error(f"Failed to persist fused ocean state: {e}")
    finally:
        db.close()
        
    return state_dict
