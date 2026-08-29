"""Seed Marine Zones from GeoJSON files with relational Source foreign keys.
Specification: docs/Backend_Workflow.md §7.3.3, §7.5
"""

import json
import logging
import os
import shapely.geometry
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.zone import Zone
from app.models.source import Source

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_zones_from_geojson(db: Session, filepath: str):
    """Seed zones with source FK resolution."""
    if not os.path.exists(filepath):
        logger.warning(f"File not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Fetch default fallback sources
    soi_src = db.query(Source).filter(Source.code == "survey_of_india").first()
    moefcc_src = db.query(Source).filter(Source.code == "moefcc").first()

    for feature in data.get("features", []):
        props = feature.get("properties", {})
        name = props.get("name", "Unknown")
        zone_type = props.get("zone_type", "restricted")
        
        geom = feature.get("geometry")
        if not geom:
            continue

        shape = shapely.geometry.shape(geom)
        wkt = shape.wkt

        # Check if exists
        existing = db.query(Zone).filter(Zone.name == name).first()
        if existing:
            logger.info(f"Zone {name} already exists. Skipping.")
            continue

        src_id = soi_src.id if (zone_type == "imbl" and soi_src) else (moefcc_src.id if moefcc_src else None)

        new_zone = Zone(
            name=name,
            zone_type=zone_type,
            geom=f"SRID=4326;{wkt}",
            source_id=src_id,
            active=True,
        )
        db.add(new_zone)

    db.commit()
    logger.info(f"Seeded zones from {filepath}")


def main():
    db = SessionLocal()
    try:
        base_dir = os.path.dirname(__file__)
        imbl_path = os.path.join(base_dir, "data", "imbl_boundary.geojson")
        mpa_path = os.path.join(base_dir, "data", "demo_mpas.geojson")

        seed_zones_from_geojson(db, imbl_path)
        seed_zones_from_geojson(db, mpa_path)
    finally:
        db.close()


if __name__ == "__main__":
    main()
