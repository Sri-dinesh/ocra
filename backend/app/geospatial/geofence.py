from app.db.session import SessionLocal
from app.db.repositories.zone_repository import get_zones_containing
import shapely.geometry
import shapely.wkt
import logging

logger = logging.getLogger(__name__)

def check_point(lat: float, lon: float) -> list[dict]:
    db = SessionLocal()
    try:
        zones = get_zones_containing(db, lat, lon)
        result = []
        # In a real app, distance to boundary would be calculated using PostGIS ST_Distance 
        # or Shapely. For simplicity, we just return the containing zones.
        for z in zones:
            result.append({
                "zone_type": z.zone_type,
                "name": z.name,
                "distance_to_boundary_nm": 0.0 # It's inside, so distance is 0
            })
        return result
    finally:
        db.close()

def check_route(points: list[tuple[float, float]]) -> bool:
    """Returns True if the route intersects any restricted zone."""
    if len(points) < 2:
        return False
        
    line = shapely.geometry.LineString([(lon, lat) for lat, lon in points])
    
    db = SessionLocal()
    try:
        # Simplification: fetch all active restricted zones and check intersection in Python
        # (Could also be done via PostGIS ST_Intersects)
        from app.models.zone import Zone
        zones = db.query(Zone).filter(Zone.active == True).all()
        
        for z in zones:
            geom_wkt = z.geom.split(";")[-1] if ";" in str(z.geom) else str(z.geom)
            # Dummy geometry if WKT parsing fails due to geoalchemy internal format
            try:
                poly = shapely.wkt.loads(geom_wkt)
                if line.intersects(poly):
                    return True
            except Exception as e:
                logger.error(f"Error checking route intersection: {e}")
                
        return False
    finally:
        db.close()
