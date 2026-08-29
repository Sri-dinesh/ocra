import asyncio
import logging
import datetime
import json
import os
from app.db.session import SessionLocal
from app.models.vessel import Vessel
from app.geospatial.geofence import check_point
from app.db.repositories.hazard_repository import get_active_hazards_for_cell
from app.watchdog.vessel_sim import simulate_vessel_drift

logger = logging.getLogger(__name__)

# Basic in-memory cooldown to avoid spamming alerts
ALERT_COOLDOWN = {}

def write_mock_alert(alert: dict):
    # As per Charan's scope, write the alert out to mock_watchdog_alert.json
    base_dir = os.path.dirname(os.path.dirname(__file__))
    mock_dir = os.path.join(base_dir, 'mock')
    os.makedirs(mock_dir, exist_ok=True)
    
    mock_file = os.path.join(mock_dir, 'mock_watchdog_alert.json')
    try:
        with open(mock_file, 'w') as f:
            json.dump(alert, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write mock alert: {e}")

def watchdog_tick():
    db = SessionLocal()
    now = datetime.datetime.now(datetime.timezone.utc)
    
    try:
        vessels = db.query(Vessel).all()
        for v in vessels:
            vessel_id = str(v.id)
            lat, lon = v.lat, v.lon
            
            # 1. IMBL Proximity Check
            zones = check_point(lat, lon)
            for z in zones:
                if z['zone_type'] == 'imbl':
                    alert_key = f"{vessel_id}_imbl"
                    if alert_key not in ALERT_COOLDOWN or (now - ALERT_COOLDOWN[alert_key]).total_seconds() > 600:
                        alert = {
                            "alert_type": "IMBL_PROXIMITY",
                            "severity": "critical",
                            "vessel_id": vessel_id,
                            "message": f"Warning: Approaching IMBL boundary.",
                            "triggered_at": now.isoformat()
                        }
                        logger.warning(f"Watchdog trigger: {alert}")
                        write_mock_alert(alert)
                        ALERT_COOLDOWN[alert_key] = now
                        
            # 2. Cyclone / Hazards Check
            hazards = get_active_hazards_for_cell(db, lat, lon, now)
            for h in hazards:
                alert_key = f"{vessel_id}_{h.hazard_type}"
                if alert_key not in ALERT_COOLDOWN or (now - ALERT_COOLDOWN[alert_key]).total_seconds() > 600:
                    alert = {
                        "alert_type": h.hazard_type.upper(),
                        "severity": h.severity,
                        "vessel_id": vessel_id,
                        "message": f"Active {h.hazard_type} warning in your area.",
                        "triggered_at": now.isoformat()
                    }
                    logger.warning(f"Watchdog trigger: {alert}")
                    write_mock_alert(alert)
                    ALERT_COOLDOWN[alert_key] = now
                    
    finally:
        db.close()

async def watchdog_loop(interval_sec: int = 10):
    logger.info("Watchdog daemon started")
    while True:
        try:
            simulate_vessel_drift()
            watchdog_tick()
        except asyncio.CancelledError:
            logger.info("Watchdog loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in watchdog loop: {e}")
        await asyncio.sleep(interval_sec)
