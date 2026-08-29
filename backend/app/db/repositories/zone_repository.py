from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.zone import Zone

def get_zones_containing(db: Session, lat: float, lon: float) -> list[Zone]:
    point_wkt = f"SRID=4326;POINT({lon} {lat})"
    return db.query(Zone).filter(
        Zone.active == True,
        func.ST_Contains(Zone.geom, func.ST_GeomFromEWKT(point_wkt))
    ).all()
