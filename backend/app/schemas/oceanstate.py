"""Pydantic schemas for /oceanstate and /sync/payload endpoints.
Owner: CHARAN (Backend-B)
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class OceanStateResponse(BaseModel):
    lat: float
    lon: float
    valid_time: str
    sst_c: Optional[float] = None
    chl_a_mgm3: Optional[float] = None
    wave_height_m: Optional[float] = None
    wind_speed_kt: Optional[float] = None
    current_speed_ms: Optional[float] = None
    current_dir_deg: Optional[float] = None
    source_map: Dict[str, str] = Field(default_factory=dict)
    quality: str = Field(default="good", description="good / stale / partial")


class HazardSummary(BaseModel):
    type: str
    severity: str


class SyncPayloadResponse(BaseModel):
    v: int = 1
    t: str
    cell: Dict[str, float]
    wave_m: Optional[float] = None
    wind_kt: Optional[float] = None
    sst_c: Optional[float] = None
    chl: Optional[float] = None
    hz: List[HazardSummary] = Field(default_factory=list)
    imbl_nm: Optional[float] = None
