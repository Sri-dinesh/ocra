from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.ocean_state import OceanState
import datetime

def insert_ocean_state(db: Session, state: dict) -> OceanState:
    geom_wkt = f"SRID=4326;POINT({state['lon']} {state['lat']})"
    
    ocean_state = OceanState(
        lat=state['lat'],
        lon=state['lon'],
        geom=geom_wkt,
        valid_time=state['valid_time'],
        sst_c=state.get('sst_c'),
        chl_a_mgm3=state.get('chl_a_mgm3'),
        wave_height_m=state.get('wave_height_m'),
        wind_speed_kt=state.get('wind_speed_kt'),
        current_speed_ms=state.get('current_speed_ms'),
        current_dir_deg=state.get('current_dir_deg'),
        source_map=state.get('source_map', {}),
        quality=state.get('quality', 'good')
    )
    db.add(ocean_state)
    db.commit()
    db.refresh(ocean_state)
    return ocean_state

def get_nearest(db: Session, lat: float, lon: float, time: datetime.datetime) -> OceanState | None:
    # Get nearest using ST_Distance on PostGIS
    point_wkt = f"SRID=4326;POINT({lon} {lat})"
    return db.query(OceanState).order_by(
        func.ST_Distance(OceanState.geom, func.ST_GeomFromEWKT(point_wkt))
    ).first()

def get_within_bbox(db: Session, bbox: tuple[float, float, float, float]) -> list[OceanState]:
    # bbox is (min_lon, min_lat, max_lon, max_lat)
    min_lon, min_lat, max_lon, max_lat = bbox
    polygon_wkt = f"SRID=4326;POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
    return db.query(OceanState).filter(
        func.ST_Contains(func.ST_GeomFromEWKT(polygon_wkt), OceanState.geom)
    ).all()
