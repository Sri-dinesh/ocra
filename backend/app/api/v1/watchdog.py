"""POST /api/v1/watchdog/subscribe handler.
Owner: CHARAN (Backend-B)
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/watchdog", tags=["Watchdog"])


class WatchdogSubscribeRequest(BaseModel):
    vessel_id: str


class WatchdogSubscribeResponse(BaseModel):
    subscribed: bool
    vessel_id: str
    poll_interval_seconds: int = 30


@router.post("/subscribe", response_model=WatchdogSubscribeResponse)
async def subscribe_watchdog(req: WatchdogSubscribeRequest) -> WatchdogSubscribeResponse:
    """Subscribe a vessel ID for proactive hazard and geofence monitoring."""
    return WatchdogSubscribeResponse(
        subscribed=True,
        vessel_id=req.vessel_id,
        poll_interval_seconds=30,
    )
