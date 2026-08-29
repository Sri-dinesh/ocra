"""Planner Agent - Entity Extraction & Intent Routing via Gemini Tool Calling.
Owner: SRIDINESH (Lead)
"""

from app.agents.state import AgentState
from app.core.logging import logger


async def plan(raw_query: str, location_hint: dict = None, role: str = "fisherman", language: str = "en-IN") -> AgentState:
    """Extract intent, location, time window, and determine required sub-agents."""
    logger.info(f"Planning query: {raw_query}")
    # TODO (SRIDINESH): Implement Gemini tool-calling entity extraction in Phase 2
    return {
        "raw_query": raw_query,
        "role": role,
        "language": language,
        "intent": "sail_clearance",
        "location": location_hint or {"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
        "time_window": "tomorrow_morning",
        "required_agents": ["ocean", "weather", "gis"],
    }
