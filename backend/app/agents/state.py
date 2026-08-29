"""LangGraph shared Agent State schema.
Owner: SRIDINESH (Lead)
"""

from typing import TypedDict, Optional, List, Dict, Any


class AgentState(TypedDict, total=False):
    raw_query: str
    role: str
    language: str
    intent: str
    location: Optional[Dict[str, Any]]
    time_window: Optional[str]
    required_agents: List[str]
    ocean_data: Optional[Dict[str, Any]]
    weather_data: Optional[Dict[str, Any]]
    gis_data: Optional[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    risk_score: Optional[float]
    risk_band: Optional[str]
    recommendation: Optional[str]
    caveats: List[str]
    map_layers: List[str]
    confidence: str
    final_response: Optional[str]
    query_id: Optional[str]
