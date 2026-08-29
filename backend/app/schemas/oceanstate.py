"""Pydantic schemas for /oceanstate and /sync/payload endpoints.
Owner: CHARAN / Backend-B (Hardened for Akash Mobile Integration)
"""

from typing import Optional, Dict, List
import datetime
from pydantic import BaseModel, Field


class OceanStateResponse(BaseModel):
    lat: float
    lon: float
    valid_time: datetime.datetime
    sst_c: Optional[float] = None
    chl_a_mgm3: Optional[float] = None
    wave_height_m: Optional[float] = None
    wind_speed_kt: Optional[float] = None
    current_speed_ms: Optional[float] = None
    current_dir_deg: Optional[float] = None
    source_map: Dict[str, str] = Field(default_factory=dict)
    quality: str = "good"  # 'good' | 'stale' | 'partial'


class HazardSummary(BaseModel):
    type: str
    severity: str


class CellPoint(BaseModel):
    lat: float
    lon: float


class SyncPayloadResponse(BaseModel):
    v: int = Field(default=1, description="Payload schema version")
    t: str = Field(..., description="Timestamp ISO string")
    cell: CellPoint = Field(..., description="Grid cell center coordinates")
    wave_m: Optional[float] = None
    wind_kt: Optional[float] = None
    sst_c: Optional[float] = None
    chl: Optional[float] = None
    hz: List[HazardSummary] = Field(default_factory=list, description="Active hazards summary")
    imbl_nm: Optional[float] = Field(default=42.6, description="Distance to nearest IMBL boundary in nm")
