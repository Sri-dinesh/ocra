"""Database Initialization and Canonical Source Vocabulary Seeding.
Specification: docs/Backend_Workflow.md §7.3.1, §7.5
"""

import logging
from sqlalchemy import text
from app.db.session import engine, Base, SessionLocal
from app.models import (
    Source,
    OceanState,
    Zone,
    Hazard,
    Vessel,
    WatchdogSubscription,
    WatchdogAlert,
    QueryLog,
    PlanStep,
    EvidenceItem,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INITIAL_SOURCES = [
    {"code": "incois_osf", "display_name": "INCOIS Ocean State Forecast", "provider_org": "INCOIS", "access_method": "ncss_api", "is_mock": False},
    {"code": "copernicus_cmems", "display_name": "Copernicus Marine Environment Monitoring Service", "provider_org": "Copernicus Marine Service", "access_method": "cmems_api", "is_mock": False},
    {"code": "noaa_erddap", "display_name": "NOAA CoastWatch Daily Chlorophyll", "provider_org": "NOAA CoastWatch", "access_method": "erddap_api", "is_mock": False},
    {"code": "incois_pfz", "display_name": "INCOIS Potential Fishing Zones", "provider_org": "INCOIS", "access_method": "pfz_api", "is_mock": False},
    {"code": "imd_bulletin", "display_name": "IMD Coastal Weather & Cyclone Bulletins", "provider_org": "India Meteorological Department", "access_method": "bulletin_feed", "is_mock": False},
    {"code": "obis", "display_name": "Ocean Biodiversity Information System", "provider_org": "OBIS/GBIF", "access_method": "rest_api", "is_mock": False},
    {"code": "survey_of_india", "display_name": "Survey of India Maritime Datum", "provider_org": "Survey of India", "access_method": "gis_datum", "is_mock": False},
    {"code": "moefcc", "display_name": "Ministry of Environment, Forest and Climate Change", "provider_org": "MoEFCC", "access_method": "gis_datum", "is_mock": False},
]


def seed_sources(db):
    """Seed the canonical sources vocabulary (§7.3.1) first before any other foreign key."""
    for s_data in INITIAL_SOURCES:
        existing = db.query(Source).filter(Source.code == s_data["code"]).first()
        if not existing:
            src = Source(**s_data)
            db.add(src)
    db.commit()
    logger.info("Canonical source vocabulary verified/seeded.")


def init_db():
    """Create all relational tables and verify initial source seeds."""
    logger.info("Ensuring PostGIS / UUID extensions if on PostgreSQL...")
    try:
        with engine.connect() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            connection.commit()
    except Exception as e:
        logger.debug(f"Extension creation skipped or not applicable (SQLite/fallback): {e}")

    logger.info("Creating relational database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Relational tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")

    # Seed sources
    db = SessionLocal()
    try:
        seed_sources(db)
    except Exception as e:
        logger.warning(f"Could not seed sources automatically: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
