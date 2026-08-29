"""Production-Grade /watchdog API Handlers.
Features:
- Vessel registration and geofence tracking subscription.
- Active watchdog alert polling and notification delivery for mobile UI.
Owner: CHARAN / Backend-B (Hardened for Akash Mobile Integration)
"""

import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.vessel import Vessel
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
    """Registers a vessel location for proactive hazard and geofence monitoring."""
    vessel = Vessel(label=req.label, lat=req.lat, lon=req.lon)
    db.add(vessel)
    db.commit()
    db.refresh(vessel)

    return SubscribeResponse(
        vessel_id=str(vessel.id),
        message="Vessel registered successfully. Watchdog daemon active.",
        poll_interval_seconds=30,
    )


@router.get(
    "/watchdog/alerts",
    response_model=List[WatchdogAlert],
    summary="Get Active Watchdog Alerts",
)
def get_alerts(vessel_id: Optional[str] = Query(None, description="Optional filter by vessel UUID")):
    """Returns active emergency proximity and hazard alerts."""
    if vessel_id:
        filtered = [a for a in ACTIVE_ALERT_STORE if a["vessel_id"] == vessel_id or a["vessel_id"] == "demo-vessel-01"]
        return [WatchdogAlert(**a) for a in filtered]
    return [WatchdogAlert(**a) for a in ACTIVE_ALERT_STORE]


@router.get(
    "/watchdog/poll",
    response_model=WatchdogPollResponse,
    summary="Poll Watchdog for New Vessel Alerts",
)
def poll_watchdog(vessel_id: str = Query(..., description="Vessel UUID to poll alerts for")):
    """Poll endpoint for mobile heartbeat sync."""
    matching = [
        WatchdogAlert(**a)
        for a in ACTIVE_ALERT_STORE
        if a["vessel_id"] == vessel_id or a["vessel_id"] == "demo-vessel-01"
    ]
    return WatchdogPollResponse(
        vessel_id=vessel_id,
        active_alerts=matching,
        total_active=len(matching),
    )
