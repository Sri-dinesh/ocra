"""LangGraph shared Agent State schema.
Authoritative state definition flowing through all nodes of the LangGraph multi-agent graph.
Owner: SRIDINESH (Lead)
"""

from typing import TypedDict, Optional, List, Dict, Any


class LocationDict(TypedDict, total=False):
    lat: float
    lon: float
    name: Optional[str]


class OceanDataDict(TypedDict, total=False):
    lat: float
    lon: float
    valid_time: str
    sst_c: Optional[float]
    chl_a_mgm3: Optional[float]
    wave_height_m: Optional[float]
    wind_speed_kt: Optional[float]
    current_speed_ms: Optional[float]
    current_dir_deg: Optional[float]
    source_map: Dict[str, str]
    quality: str


class WeatherDataDict(TypedDict, total=False):
    hazards: List[Dict[str, Any]]
    has_cyclone: bool
    highest_severity: str
    source: str


class GisDataDict(TypedDict, total=False):
    zones: List[Dict[str, Any]]
    distance_to_imbl_nm: Optional[float]
    is_inside_restricted: bool


class EvidenceItemDict(TypedDict, total=False):
    claim: str
    source: str
    fetched_at: str
    supporting_value: Optional[Any]
    unsupported: Optional[bool]
    stale: Optional[bool]


class AgentState(TypedDict, total=False):
    query_id: str
    raw_query: str
    role: str
    language: str
    intent: str
    location: Optional[Dict[str, Any]]
    time_window: Optional[str]
    required_agents: List[str]
    
    # Domain Sub-agent Outputs
    ocean_data: Optional[Dict[str, Any]]
    weather_data: Optional[Dict[str, Any]]
    gis_data: Optional[Dict[str, Any]]
    
    # Verified Reasoning & Synthesis
    evidence: List[Dict[str, Any]]
    risk_score: Optional[float]
    risk_band: Optional[str]
    sail_allowed: Optional[bool]
    recommendation: Optional[str]
    caveats: List[str]
    map_layers: List[str]
    confidence: str
    final_response: Optional[str]
    
    # Control & Errors
    clarification_prompt: Optional[str]
    error: Optional[str]
