from pydantic import BaseModel
from typing import Optional, Dict
import datetime

class OceanStateResponse(BaseModel):
    lat: float
    lon: float
    valid_time: datetime.datetime
    sst_c: Optional[float] = None
    chl_a_mgm3: Optional[float] = None
    wave_height_m: Optional[float] = None
    wind_speed_kt: Optional[float] = None
    source_map: Dict[str, str]
    quality: str

class SyncPayloadResponse(BaseModel):
    v: str
    t: str
    cell: str
    wave_m: Optional[float]
    wind_kt: Optional[float]
    sst_c: Optional[float]
    chl: Optional[float]
    hz: int
    imbl_nm: float
