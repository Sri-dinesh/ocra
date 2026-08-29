"""Production-Grade Proactive Watchdog Daemon for Marine Safety.
Monitors registered vessel coordinates against:
1. IMBL international boundary proximity & restricted zone incursions.
2. Active meteorological warnings and high wave thresholds.
3. Dynamically updates live alert queues for mobile push/poll delivery.
Owner: CHARAN / Backend-B (Hardened for Real Data Integration)
"""

import asyncio
import logging
import datetime
from typing import Dict
from app.db.session import SessionLocal
from app.models.vessel import Vessel
from app.geospatial.geofence import check_point
from app.db.repositories.hazard_repository import get_active_hazards_for_cell
from app.watchdog.vessel_sim import simulate_vessel_drift
from app.api.v1.watchdog import ACTIVE_ALERT_STORE

logger = logging.getLogger(__name__)

# Cooldown dictionary to avoid spamming duplicate alerts (key -> last_alert_time)
ALERT_COOLDOWN: Dict[str, datetime.datetime] = {}


def emit_live_alert(alert: dict):
    """Pushes alert to live in-memory store for mobile consumption."""
    # Deduplicate in store
    existing_keys = {
        f"{a['vessel_id']}_{a['alert_type']}" for a in ACTIVE_ALERT_STORE
    }
    key = f"{alert['vessel_id']}_{alert['alert_type']}"
    if key not in existing_keys:
        ACTIVE_ALERT_STORE.insert(0, alert)
        # Cap active alerts to latest 100
        if len(ACTIVE_ALERT_STORE) > 100:
            ACTIVE_ALERT_STORE.pop()
    logger.warning(f"[Watchdog Live Alert] {alert['severity'].upper()}: {alert['message']}")


def watchdog_tick():
    """Executes single proactive monitoring sweep across all registered vessels."""
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
                dist_nm = z.get("distance_to_boundary_nm", 50.0)
                if z.get("zone_type") == "imbl" and dist_nm <= 5.0:
                    alert_key = f"{vessel_id}_imbl"
                    if (
                        alert_key not in ALERT_COOLDOWN
                        or (now - ALERT_COOLDOWN[alert_key]).total_seconds() > 600
                    ):
                        severity = "critical" if dist_nm <= 2.0 else "high"
                        alert = {
                            "alert_type": "IMBL_PROXIMITY",
                            "severity": severity,
                            "vessel_id": vessel_id,
                            "message": f"You are {dist_nm:.1f}nm from the International Maritime Boundary Line. Recommend course correction.",
                            "triggered_at": now.isoformat(),
                        }
                        emit_live_alert(alert)
                        ALERT_COOLDOWN[alert_key] = now

            # 2. Cyclone / Meteorological Hazards Check
            hazards = get_active_hazards_for_cell(db, lat, lon, now)
            for h in hazards:
                alert_key = f"{vessel_id}_{h.hazard_type}"
                if (
                    alert_key not in ALERT_COOLDOWN
                    or (now - ALERT_COOLDOWN[alert_key]).total_seconds() > 600
                ):
                    alert = {
                        "alert_type": h.hazard_type.upper(),
                        "severity": h.severity,
                        "vessel_id": vessel_id,
                        "message": f"Active {h.hazard_type.upper()} warning detected in your operational sector.",
                        "triggered_at": now.isoformat(),
                    }
                    emit_live_alert(alert)
                    ALERT_COOLDOWN[alert_key] = now

            # 3. Simulate drift for active vessels
            new_lat, new_lon = simulate_vessel_drift(lat, lon)
            v.lat = new_lat
            v.lon = new_lon

        db.commit()
    except Exception as e:
        logger.error(f"[Watchdog Daemon] Error during tick: {e}")
    finally:
        db.close()


async def run_watchdog_daemon(interval_seconds: int = 15):
    """Continuous async background daemon loop."""
    logger.info(f"Starting Watchdog monitoring daemon (interval={interval_seconds}s)...")
    while True:
        try:
            watchdog_tick()
        except Exception as e:
            logger.error(f"Error in watchdog loop: {e}")
        await asyncio.sleep(interval_seconds)
