"""Planner Agent for ORCA.
Extracts entities (location, time, intent) and determines required sub-agents.
Includes clarification short-circuit and deterministic fallbacks.
Owner: SRIDINESH (Lead)
"""

import re
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from app.agents.state import AgentState
from app.core.llm import llm_client
from app.core.logging import logger

# Well-known coastal port coordinates for disambiguation
KNOWN_COASTAL_LOCATIONS = {
    "kakinada": {"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
    "visakhapatnam": {"lat": 17.6868, "lon": 83.2185, "name": "Visakhapatnam"},
    "vizag": {"lat": 17.6868, "lon": 83.2185, "name": "Visakhapatnam"},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "name": "Chennai"},
    "rameswaram": {"lat": 9.2876, "lon": 79.3129, "name": "Rameswaram"},
    "rameshwaram": {"lat": 9.2876, "lon": 79.3129, "name": "Rameswaram"},
    "tuticorin": {"lat": 8.7642, "lon": 78.1348, "name": "Tuticorin"},
    "thoothukudi": {"lat": 8.7642, "lon": 78.1348, "name": "Tuticorin"},
    "paradip": {"lat": 20.3164, "lon": 86.6114, "name": "Paradip"},
    "kochi": {"lat": 9.9312, "lon": 76.2673, "name": "Kochi"},
    "cochin": {"lat": 9.9312, "lon": 76.2673, "name": "Kochi"},
    "mumbai": {"lat": 18.9220, "lon": 72.8347, "name": "Mumbai"},
    "mangalore": {"lat": 12.9141, "lon": 74.8560, "name": "Mangalore"},
}

INTENT_AGENT_MAPPING = {
    "sail_clearance": ["ocean", "weather", "gis"],
    "pfz_lookup": ["ocean", "gis"],
    "anomaly_detection": ["ocean", "weather"],
    "route_request": ["ocean", "gis"],
    "general_query": ["ocean", "weather", "gis"],
    "clarification_needed": [],
}


class PlanExtraction(BaseModel):
    intent: str = Field(
        ...,
        description="One of: sail_clearance, pfz_lookup, anomaly_detection, route_request, general_query, clarification_needed",
    )
    location_name: Optional[str] = Field(None, description="Coastal town or port name if mentioned")
    lat: Optional[float] = Field(None, description="Latitude if specified or known")
    lon: Optional[float] = Field(None, description="Longitude if specified or known")
    time_window: Optional[str] = Field(None, description="Extracted time window, e.g. 'tomorrow morning'")
    clarification_prompt: Optional[str] = Field(
        None, description="Prompt asking user for location if query is completely ambiguous"
    )


PLANNER_SYSTEM_PROMPT = """You are the ORCA Marine Planner Agent.
Your job is to deconstruct natural language marine questions from fishermen, researchers, or coast guard officers.
Extract the user's intent, coastal location, and time window.

Intents:
- 'sail_clearance': Questions like "Can I go fishing tomorrow?", "Is it safe to sail?"
- 'pfz_lookup': "Where are the fish?", "Show PFZ zones", "Find tuna hotspots"
- 'anomaly_detection': "Are sea temperatures unusual?", "Is SST normal?"
- 'route_request': "Best route to point X", "How to navigate around IMBL?"
- 'general_query': "What is the wave height near Kakinada?"
- 'clarification_needed': When NO location or context is provided (e.g. just "Can I go out?").

If the location is missing and cannot be inferred, set intent='clarification_needed' and supply clarification_prompt.
"""


def _rule_based_extraction(
    raw_query: str, location_hint: Optional[Dict[str, Any]] = None
) -> PlanExtraction:
    """Deterministic fallback parser for common marine queries."""
    query_lower = raw_query.lower()

    # 1. Location extraction
    detected_loc = None
    if location_hint and "lat" in location_hint and "lon" in location_hint:
        detected_loc = location_hint
    else:
        for name, coords in KNOWN_COASTAL_LOCATIONS.items():
            if name in query_lower:
                detected_loc = coords
                break

    # 2. Time extraction
    time_window = "today"
    if "tomorrow" in query_lower:
        time_window = "tomorrow_morning" if "morning" in query_lower else "tomorrow"
    elif "next week" in query_lower:
        time_window = "next_week"

    # 3. Intent extraction
    if not detected_loc and len(query_lower.split()) < 4 and ("can i" in query_lower or "safe" in query_lower):
        return PlanExtraction(
            intent="clarification_needed",
            clarification_prompt="Which coastal area or port would you like to sail from?",
        )

    if any(k in query_lower for k in ["safe", "sail", "fishing", "go out", "leave port", "clearance"]):
        intent = "sail_clearance"
    elif any(k in query_lower for k in ["pfz", "fish zone", "catch", "tuna", "hotspot"]):
        intent = "pfz_lookup"
    elif any(k in query_lower for k in ["route", "navigate", "path", "waypoint"]):
        intent = "route_request"
    elif any(k in query_lower for k in ["temperature", "sst", "anomaly", "unusual", "chlorophyll"]):
        intent = "anomaly_detection"
    else:
        intent = "general_query"

    lat = detected_loc.get("lat", 16.9891) if detected_loc else 16.9891
    lon = detected_loc.get("lon", 82.2475) if detected_loc else 82.2475
    loc_name = detected_loc.get("name", "Kakinada") if detected_loc else "Kakinada"

    return PlanExtraction(
        intent=intent,
        location_name=loc_name,
        lat=lat,
        lon=lon,
        time_window=time_window,
    )


async def plan(
    raw_query: str,
    location_hint: Optional[Dict[str, Any]] = None,
    role: str = "fisherman",
    language: str = "en-IN",
) -> AgentState:
    """Execute entity extraction, intent classification, and sub-agent planning."""
    logger.info(f"Planner Agent evaluating: '{raw_query}' (role={role}, lang={language})")

    extraction: Optional[PlanExtraction] = None

    if llm_client.is_configured():
        prompt = f"Query: {raw_query}\nLocation Hint: {location_hint}\nUser Role: {role}"
        structured_res = await llm_client.generate_structured(
            prompt=prompt,
            schema=PlanExtraction,
            system_instruction=PLANNER_SYSTEM_PROMPT,
        )
        if structured_res and "intent" in structured_res:
            try:
                extraction = PlanExtraction(**structured_res)
            except Exception as e:
                logger.warning(f"Failed to parse LLM plan output: {e}")

    if not extraction:
        extraction = _rule_based_extraction(raw_query, location_hint)

    # Resolve coordinates if name provided but lat/lon missing
    if extraction.location_name and (extraction.lat is None or extraction.lon is None):
        key = extraction.location_name.lower()
        if key in KNOWN_COASTAL_LOCATIONS:
            extraction.lat = KNOWN_COASTAL_LOCATIONS[key]["lat"]
            extraction.lon = KNOWN_COASTAL_LOCATIONS[key]["lon"]

    # Handle clarification needed
    if extraction.intent == "clarification_needed":
        return {
            "raw_query": raw_query,
            "role": role,
            "language": language,
            "intent": "clarification_needed",
            "required_agents": [],
            "clarification_prompt": extraction.clarification_prompt
            or "Could you specify which port or coastal location you are asking about?",
            "recommendation": extraction.clarification_prompt
            or "Could you specify which port or coastal location you are asking about?",
            "final_response": extraction.clarification_prompt
            or "Could you specify which port or coastal location you are asking about?",
            "confidence": "low",
            "evidence": [],
            "caveats": ["Location parameter missing."],
            "map_layers": [],
        }

    resolved_loc = {
        "lat": extraction.lat if extraction.lat is not None else 16.9891,
        "lon": extraction.lon if extraction.lon is not None else 82.2475,
        "name": extraction.location_name or "Kakinada",
    }

    required_agents = INTENT_AGENT_MAPPING.get(extraction.intent, ["ocean", "weather", "gis"])

    state: AgentState = {
        "raw_query": raw_query,
        "role": role,
        "language": language,
        "intent": extraction.intent,
        "location": resolved_loc,
        "time_window": extraction.time_window or "tomorrow_morning",
        "required_agents": required_agents,
        "evidence": [],
        "caveats": [],
        "map_layers": ["pfz", "sst_heatmap", "geofence"],
        "confidence": "high",
    }

    logger.info(f"Planned intent={extraction.intent}, loc={resolved_loc}, agents={required_agents}")
    return state
