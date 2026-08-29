"""Pydantic schemas for /watchdog endpoints.
Owner: CHARAN / Backend-B (Hardened for Akash Mobile Integration)
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class SubscribeRequest(BaseModel):
    label: str = Field(..., description="Vessel display label, e.g. 'Sea Hawk-01'")
    lat: float = Field(..., description="Initial latitude")
    lon: float = Field(..., description="Initial longitude")


class SubscribeResponse(BaseModel):
    vessel_id: str = Field(..., description="Unique UUID of registered vessel")
    message: str = Field(..., description="Subscription confirmation status")
    poll_interval_seconds: int = Field(default=30, description="Recommended polling cadence in seconds")


class WatchdogAlert(BaseModel):
    alert_type: str = Field(..., description="HIGH_WAVE, IMBL_PROXIMITY, CYCLONE, GALE")
    severity: Literal["low", "moderate", "high", "critical"] = Field(..., description="Alert severity level")
    vessel_id: str = Field(..., description="Vessel target UUID or label")
    message: str = Field(..., description="Human-readable warning text")
    triggered_at: str = Field(..., description="Alert timestamp ISO string")


class WatchdogPollResponse(BaseModel):
    vessel_id: str
    active_alerts: List[WatchdogAlert] = Field(default_factory=list)
    total_active: int = 0
