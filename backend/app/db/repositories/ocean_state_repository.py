"""Repository for OceanState Environmental Records.
Specification: docs/Backend_Workflow.md §7.3.2
"""

import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.ocean_state import OceanState
from app.models.source import Source


def get_source_id_by_code(db: Session, code: str) -> Optional[any]:
    """Helper to lookup source UUID by code."""
    if not code:
        return None
    source_obj = db.query(Source).filter(Source.code == code).first()
    return source_obj.id if source_obj else None


def insert_ocean_state(db: Session, state: dict) -> OceanState:
    """Inserts a fused ocean state with relational source foreign keys."""
    geom_wkt = f"SRID=4326;POINT({state['lon']} {state['lat']})"
    
    # Map friendly source names to codes
    src_map = state.get("source_map", {})
    code_lookup = {
        "Copernicus CMEMS": "copernicus_cmems",
        "INCOIS OSF": "incois_osf",
        "NOAA ERDDAP": "noaa_erddap",
        "INCOIS PFZ": "incois_pfz",
        "IMD": "imd_bulletin",
        "OBIS": "obis",
    }

    sst_code = code_lookup.get(src_map.get("sst_c"), "copernicus_cmems")
    chl_code = code_lookup.get(src_map.get("chl_a_mgm3"), "noaa_erddap")
    wave_code = code_lookup.get(src_map.get("wave_height_m"), "incois_osf")
    wind_code = code_lookup.get(src_map.get("wind_speed_kt"), "incois_osf")
    curr_code = code_lookup.get(src_map.get("current_speed_ms"), "copernicus_cmems")

    ocean_state = OceanState(
        lat=state["lat"],
        lon=state["lon"],
        geom=geom_wkt,
        valid_time=state["valid_time"],
        sst_c=state.get("sst_c"),
        sst_source_id=get_source_id_by_code(db, sst_code),
        chl_a_mgm3=state.get("chl_a_mgm3"),
        chl_source_id=get_source_id_by_code(db, chl_code),
        wave_height_m=state.get("wave_height_m"),
        wave_source_id=get_source_id_by_code(db, wave_code),
        wind_speed_kt=state.get("wind_speed_kt"),
        wind_source_id=get_source_id_by_code(db, wind_code),
        current_speed_ms=state.get("current_speed_ms"),
        current_dir_deg=state.get("current_dir_deg"),
        current_source_id=get_source_id_by_code(db, curr_code),
        quality=state.get("quality", "good"),
    )
    db.add(ocean_state)
    db.commit()
    db.refresh(ocean_state)
    return ocean_state


def get_nearest(db: Session, lat: float, lon: float, time: datetime.datetime) -> Optional[OceanState]:
    """Retrieve nearest ocean state record."""
    try:
        point_wkt = f"SRID=4326;POINT({lon} {lat})"
        return db.query(OceanState).order_by(
            func.ST_Distance(OceanState.geom, func.ST_GeomFromEWKT(point_wkt))
        ).first()
    except Exception:
        return db.query(OceanState).first()
