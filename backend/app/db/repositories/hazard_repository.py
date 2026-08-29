from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.hazard import Hazard
import datetime

def get_active_hazards_for_cell(db: Session, lat: float, lon: float, time: datetime.datetime) -> list[Hazard]:
    point_wkt = f"SRID=4326;POINT({lon} {lat})"
    return db.query(Hazard).filter(
        Hazard.valid_from <= time,
        or_(Hazard.valid_until == None, Hazard.valid_until >= time),
        or_(
            Hazard.geom == None,
            func.ST_Contains(Hazard.geom, func.ST_GeomFromEWKT(point_wkt))
        )
    ).all()
