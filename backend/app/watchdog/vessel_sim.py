import logging
from app.db.session import SessionLocal
from app.models.vessel import Vessel
import datetime
import random

logger = logging.getLogger(__name__)

def simulate_vessel_drift():
    db = SessionLocal()
    try:
        vessels = db.query(Vessel).all()
        for v in vessels:
            # Random drift, moving generally towards east (towards IMBL typically)
            v.lat += random.uniform(-0.01, 0.01)
            v.lon += random.uniform(0.005, 0.015)
            v.updated_at = datetime.datetime.now(datetime.timezone.utc)
            
        db.commit()
        if vessels:
            logger.info(f"Simulated drift for {len(vessels)} vessels.")
    except Exception as e:
        logger.error(f"Error simulating vessel drift: {e}")
    finally:
        db.close()
