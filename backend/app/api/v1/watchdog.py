"""Production-Grade /watchdog API Handlers.
Specification: docs/Backend_Workflow.md §7.3.6-7
Features:
- Vessel registration and persistent WatchdogSubscription creation.
- Real-time geofence proximity evaluation for newly registered and polled vessels.
- Durable WatchdogAlert query and in-memory fast delivery for mobile UI.
Owner: CHARAN / Backend-B (Hardened for Real Data Integration)
"""

import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.vessel import Vessel
from app.models.watchdog_subscription import WatchdogSubscription
from app.models.watchdog_alert import WatchdogAlert as WatchdogAlertModel
from app.schemas.watchdog import (
    SubscribeRequest,
    SubscribeResponse,
    WatchdogAlert,
    WatchdogPollResponse,
)
from app.geospatial.geofence import check_point
from app.db.repositories.hazard_repository import get_active_hazards_for_cell

router = APIRouter(tags=["Watchdog"])

# In-memory active alert store for mobile fast-polling
ACTIVE_ALERT_STORE: List[dict] = []


def evaluate_vessel_safety(vessel_id: str, lat: float, lon: float, db: Session) -> List[dict]:
    """Evaluate real spatial proximity to IMBL and active hazards for a vessel."""
    now = datetime.datetime.now(datetime.timezone.utc)
    new_alerts: List[dict] = []

    # 1. IMBL Proximity Check against real authoritative boundaries
    zones = check_point(lat, lon)
    for z in zones:
        dist_nm = z.get("distance_to_boundary_nm", 50.0)
        is_inside = z.get("is_inside", False)
        if z.get("zone_type") == "imbl" and (dist_nm <= 5.0 or is_inside):
            severity = "critical" if (dist_nm <= 2.0 or is_inside) else "high"
            msg = (
                f"You have crossed into the International Maritime Boundary Line zone ({z['name']}). Immediate course correction required."
                if is_inside
                else f"You are {dist_nm:.1f}nm from the International Maritime Boundary Line. Recommend course correction."
            )
            alert_dict = {
                "alert_type": "IMBL_PROXIMITY",
                "severity": severity,
                "vessel_id": vessel_id,
                "message": msg,
                "triggered_at": now.isoformat(),
            }
            new_alerts.append(alert_dict)

            # Persist to database
            try:
                v_uuid = uuid.UUID(vessel_id) if isinstance(vessel_id, str) else vessel_id
                db_alert = WatchdogAlertModel(
                    vessel_id=v_uuid,
                    alert_type="IMBL_PROXIMITY",
                    severity=severity,
                    message=msg,
                    triggered_at=now,
                )
                db.add(db_alert)
                db.commit()
            except Exception:
                db.rollback()

    # 2. Meteorological Hazards Check
    try:
        hazards = get_active_hazards_for_cell(db, lat, lon, now)
        for h in hazards:
            alert_dict = {
                "alert_type": h.hazard_type.upper(),
                "severity": h.severity,
                "vessel_id": vessel_id,
                "message": f"Active {h.hazard_type.upper()} advisory in operational sector ({h.description}).",
                "triggered_at": now.isoformat(),
            }
            new_alerts.append(alert_dict)
    except Exception:
        pass

    # Update in-memory store
    for na in new_alerts:
        existing_keys = {f"{a['vessel_id']}_{a['alert_type']}" for a in ACTIVE_ALERT_STORE}
        key = f"{na['vessel_id']}_{na['alert_type']}"
        if key not in existing_keys:
            ACTIVE_ALERT_STORE.insert(0, na)

    return new_alerts


@router.post(
    "/watchdog/subscribe",
    response_model=SubscribeResponse,
    status_code=status.HTTP_200_OK,
    summary="Subscribe Vessel for Watchdog Proactive Alerts",
)
def subscribe_vessel(req: SubscribeRequest, db: Session = Depends(get_db)):
    """Registers a vessel, creates a persistent subscription, and evaluates immediate boundary safety."""
    vessel = Vessel(label=req.label, lat=req.lat, lon=req.lon)
    db.add(vessel)
    db.commit()
    db.refresh(vessel)

    subscription = WatchdogSubscription(
        vessel_id=vessel.id,
        poll_interval_seconds=30,
        active=True,
    )
    db.add(subscription)
    db.commit()

    # Evaluate immediate real-time safety upon subscription
    evaluate_vessel_safety(str(vessel.id), req.lat, req.lon, db)

    return SubscribeResponse(
        vessel_id=str(vessel.id),
        message="Vessel registered successfully with active watchdog subscription.",
        poll_interval_seconds=30,
    )


@router.get(
    "/watchdog/alerts",
    response_model=List[WatchdogAlert],
    summary="Get Active & Historical Watchdog Alerts",
)
def get_alerts(
    vessel_id: Optional[str] = Query(None, description="Optional filter by vessel UUID"),
    db: Session = Depends(get_db),
):
    """Returns alerts from durable database and active live memory queue."""
    alerts_out: List[WatchdogAlert] = []

    # 1. Fetch from durable DB (§7.3.7)
    try:
        query = db.query(WatchdogAlertModel).order_by(WatchdogAlertModel.triggered_at.desc())
        if vessel_id:
            try:
                v_uuid = uuid.UUID(vessel_id)
                query = query.filter(WatchdogAlertModel.vessel_id == v_uuid)
            except Exception:
                pass
        db_alerts = query.limit(50).all()
        for da in db_alerts:
            alerts_out.append(
                WatchdogAlert(
                    alert_type=da.alert_type,
                    severity=da.severity,
                    vessel_id=str(da.vessel_id),
                    message=da.message,
                    triggered_at=da.triggered_at.isoformat() if da.triggered_at else datetime.datetime.now(datetime.timezone.utc).isoformat(),
                )
            )
    except Exception:
        pass

    # 2. Add in-memory active alerts if not already in list
    existing_keys = {f"{a.vessel_id}_{a.alert_type}" for a in alerts_out}
    for mem_a in ACTIVE_ALERT_STORE:
        if not vessel_id or mem_a["vessel_id"] == vessel_id:
            key = f"{mem_a['vessel_id']}_{mem_a['alert_type']}"
            if key not in existing_keys:
                alerts_out.insert(0, WatchdogAlert(**mem_a))

    return alerts_out


@router.get(
    "/watchdog/poll",
    response_model=WatchdogPollResponse,
    summary="Poll Watchdog for New Vessel Alerts",
)
def poll_watchdog(
    vessel_id: str = Query(..., description="Vessel UUID to poll alerts for"),
    db: Session = Depends(get_db),
):
    """Poll endpoint for mobile heartbeat sync with real-time safety evaluation."""
    # Look up vessel coordinates to evaluate current live boundary status
    try:
        v_uuid = uuid.UUID(vessel_id)
        v = db.query(Vessel).filter(Vessel.id == v_uuid).first()
        if v:
            evaluate_vessel_safety(vessel_id, v.lat, v.lon, db)
    except Exception:
        pass

    active_alerts = get_alerts(vessel_id=vessel_id, db=db)
    return WatchdogPollResponse(
        vessel_id=vessel_id,
        active_alerts=active_alerts,
        total_active=len(active_alerts),
    )
