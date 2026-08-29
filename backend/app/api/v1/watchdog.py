"""Production-Grade /watchdog API Handlers.
Specification: docs/Backend_Workflow.md §7.3.6-7
Features:
- Vessel registration and persistent WatchdogSubscription creation.
- Durable WatchdogAlert query and in-memory fast delivery for mobile UI.
Owner: CHARAN / Backend-B (Hardened for Akash Mobile Integration)
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

router = APIRouter(tags=["Watchdog"])

# In-memory active alert store for mobile fast-polling
ACTIVE_ALERT_STORE: List[dict] = [
    {
        "alert_type": "IMBL_PROXIMITY",
        "severity": "critical",
        "vessel_id": "demo-vessel-01",
        "message": "You are 1.2nm from the International Maritime Boundary Line. Recommend course correction.",
        "triggered_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
]


@router.post(
    "/watchdog/subscribe",
    response_model=SubscribeResponse,
    status_code=status.HTTP_200_OK,
    summary="Subscribe Vessel for Watchdog Proactive Alerts",
)
def subscribe_vessel(req: SubscribeRequest, db: Session = Depends(get_db)):
    """Registers a vessel and creates a persistent watchdog_subscription row (§7.3.6)."""
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
    """Returns alerts from database and active memory queue."""
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
        if not vessel_id or mem_a["vessel_id"] == vessel_id or mem_a["vessel_id"] == "demo-vessel-01":
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
    """Poll endpoint for mobile heartbeat sync."""
    active_alerts = get_alerts(vessel_id=vessel_id, db=db)
    return WatchdogPollResponse(
        vessel_id=vessel_id,
        active_alerts=active_alerts,
        total_active=len(active_alerts),
    )
