"""Production Agent State Definitions for ORCA Multi-Agent StateGraph.
Authoritative state schema flowing across all nodes and specialized sub-agent boundaries.
Owner: SRIDINESH (Lead)
"""

from typing import TypedDict, Optional, List, Dict, Any


class LocationContext(TypedDict, total=False):
    lat: float
    lon: float
    name: str
    state_or_region: Optional[str]
    harbor_type: Optional[str]
    confidence: float


class TimeWindowContext(TypedDict, total=False):
    raw_expression: str
    target_start_iso: str
    target_end_iso: str
    is_forecast: bool
    forecast_lead_hours: int


class OceanTelemetry(TypedDict, total=False):
    lat: float
    lon: float
    valid_time: str
    fetched_at: str
    sst_c: Optional[float]
    chl_a_mgm3: Optional[float]
    wave_height_m: Optional[float]
    swell_period_s: Optional[float]
    swell_dir_deg: Optional[float]
    wind_speed_kt: Optional[float]
    wind_dir_deg: Optional[float]
    current_speed_ms: Optional[float]
    current_dir_deg: Optional[float]
    source_map: Dict[str, str]
    quality: str


class WeatherHazardRecord(TypedDict, total=False):
    type: str  # cyclone, gale, lightning, high_wave
    severity: str  # low, moderate, high, critical
    headline: str
    valid_from: str
    valid_until: Optional[str]
    source: str
    bulletin_id: Optional[str]


class WeatherTelemetry(TypedDict, total=False):
    hazards: List[WeatherHazardRecord]
    has_cyclone: bool
    highest_severity: str
    cyclone_category: Optional[str]
    bulletin_text: Optional[str]
    source: str
    fetched_at: str


class GisTelemetry(TypedDict, total=False):
    zones: List[Dict[str, Any]]
    distance_to_imbl_nm: Optional[float]
    nearest_boundary_name: Optional[str]
    is_inside_restricted: bool
    restricted_zone_names: List[str]
    source: str


# ==============================================================================
# SPECIALIZED AGENT DOMAIN TELEMETRY (SIH26176)
# ==============================================================================

class WeatherIntelligenceTelemetry(TypedDict, total=False):
    agent_name: str
    synoptic_summary: str
    storm_distance_km: Optional[float]
    is_squall_alert: bool
    is_cyclone_alert: bool
    pressure_trend_hpa: Optional[float]
    weather_risk_index: float  # 0 to 100
    weather_caveats: List[str]
    advisory_bulletin: Optional[str]


class OceanAnalyticsTelemetry(TypedDict, total=False):
    agent_name: str
    thermal_gradient_c_per_km: Optional[float]
    upwelling_index: float  # 0 to 1.0
    pfz_suitability_score: float  # 0 to 1.0
    target_species: List[str]  # e.g., ["Yellowfin Tuna", "Indian Mackerel", "Sardines"]
    is_thermal_front_present: bool
    productivity_anomaly_detected: bool
    anomaly_explanation: Optional[str]


class NavigationIntelligenceTelemetry(TypedDict, total=False):
    agent_name: str
    navigation_status: str  # CLEAR, CAUTION, RESTRICTED, FORBIDDEN
    nearest_sanctuary_name: Optional[str]
    sanctuary_distance_nm: Optional[float]
    imbl_buffer_status: str  # SAFE, WARNING, BREACH
    suggested_waypoints: List[Dict[str, float]]
    avoidance_reason: Optional[str]


class CriticAuditRecord(TypedDict, total=False):
    agent_name: str
    audit_passed: bool
    contradiction_detected: bool
    corrected_recommendation: Optional[str]
    ungrounded_tokens_pruned: List[str]
    confidence_rating: str  # HIGH, MODERATE, LOW
    audit_notes: List[str]


class EvidenceItemRecord(TypedDict, total=False):
    id: str
    claim: str
    source: str
    fetched_at: str
    supporting_value: Optional[Any]
    tolerance_matched: bool
    stale: bool
    unsupported: bool


class ExecutionTelemetry(TypedDict, total=False):
    start_time_epoch: float
    end_time_epoch: float
    latency_ms: float
    nodes_executed: List[str]
    model_used: Optional[str]
    tokens_evaluated: Optional[int]


class AgentState(TypedDict, total=False):
    # Request Identifiers
    query_id: str
    session_id: Optional[str]
    conversation_id: Optional[str]
    raw_query: str
    role: str  # fisherman, researcher, coast_guard, policymaker
    language: str  # en-IN, ta-IN, hi-IN, te-IN
    conversation_history: List[Dict[str, Any]]
    inherited_context: Optional[Dict[str, Any]]
    
    # Planner Outputs
    intent: str  # sail_clearance, pfz_lookup, anomaly_detection, route_request, general_query, clarification_needed
    intent_confidence: float
    location: Optional[LocationContext]
    time_window: Optional[TimeWindowContext]
    required_agents: List[str]
    clarification_prompt: Optional[str]
    
    # Domain Telemetry
    ocean_data: Optional[OceanTelemetry]
    weather_data: Optional[WeatherTelemetry]
    gis_data: Optional[GisTelemetry]
    
    # Specialized Multi-Agent Intelligence Layer
    weather_intelligence: Optional[WeatherIntelligenceTelemetry]
    ocean_analytics: Optional[OceanAnalyticsTelemetry]
    navigation_intelligence: Optional[NavigationIntelligenceTelemetry]
    critic_audit: Optional[CriticAuditRecord]

    # Guardrail & Reasoning
    evidence: List[EvidenceItemRecord]
    risk_score: Optional[float]  # 0.0 to 100.0
    risk_band: Optional[str]  # low, moderate, high, extreme
    sail_allowed: Optional[bool]
    cyclone_override_active: bool
    confidence: str  # high, medium, low
    caveats: List[str]
    map_layers: List[str]
    
    # Output Synthesis
    recommendation: Optional[str]
    final_response: Optional[str]
    citations: List[str]
    
    # System Telemetry & Error Handling
    telemetry: Optional[ExecutionTelemetry]
    error: Optional[str]
