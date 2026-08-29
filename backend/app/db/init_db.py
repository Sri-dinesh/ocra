import logging
from app.db.session import engine, Base
from sqlalchemy import text

# Import all models to ensure they are registered with Base.metadata
from app.models.ocean_state import OceanState
from app.models.zone import Zone
from app.models.hazard import Hazard
from app.models.vessel import Vessel
from app.models.query_log import QueryLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    logger.info("Ensuring PostGIS extension is enabled...")
    try:
        with engine.connect() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            connection.commit()
    except Exception as e:
        logger.warning(f"Could not enable PostGIS automatically. Ensure it is enabled in your database. Error: {e}")

    logger.info("Creating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
