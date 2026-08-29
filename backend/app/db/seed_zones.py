import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import engine, SessionLocal
from app.models.zone import Zone
import os
import shapely.geometry
try:
    import geoalchemy2.shape
except ImportError:
    pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_zones_from_geojson(db: Session, filepath: str):
    if not os.path.exists(filepath):
        logger.warning(f"File not found: {filepath}")
        return

    with open(filepath, 'r') as f:
        data = json.load(f)

    for feature in data.get('features', []):
        props = feature.get('properties', {})
        name = props.get('name', 'Unknown')
        zone_type = props.get('zone_type', 'restricted')
        source = props.get('source', 'seed_script')
        
        geom = feature.get('geometry')
        if not geom:
            continue
            
        shape = shapely.geometry.shape(geom)
        wkt = shape.wkt
        
        # Check if exists
        existing = db.query(Zone).filter(Zone.name == name).first()
        if existing:
            logger.info(f"Zone {name} already exists. Skipping.")
            continue
            
        new_zone = Zone(
            name=name,
            zone_type=zone_type,
            geom=f"SRID=4326;{wkt}",
            source=source,
            active=True
        )
        db.add(new_zone)
    
    db.commit()
    logger.info(f"Seeded zones from {filepath}")

def main():
    db = SessionLocal()
    try:
        base_dir = os.path.dirname(__file__)
        imbl_path = os.path.join(base_dir, 'data', 'imbl_boundary.geojson')
        mpa_path = os.path.join(base_dir, 'data', 'demo_mpas.geojson')
        
        seed_zones_from_geojson(db, imbl_path)
        seed_zones_from_geojson(db, mpa_path)
    finally:
        db.close()

if __name__ == "__main__":
    main()
