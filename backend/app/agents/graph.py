"""LangGraph Multi-Agent Orchestration Graph for ORCA.
Wires the Planner Agent, parallel domain sub-agents, deterministic guardrail,
risk engine, and synthesis agent into a stateful compiled workflow.
Owner: SRIDINESH (Lead)
"""

import asyncio
from typing import Dict, Any
from app.agents.state import AgentState
from app.agents.planner_agent import plan
from app.reasoning.guardrail import run_guardrail
from app.reasoning.risk_engine import evaluate_risk_and_recommendation
from app.agents.synthesis_agent import synthesize
from app.core.logging import logger

# ==============================================================================
# MERGE MARKERS: Replace with Charan's live implementations on merge day
# ==============================================================================
# MERGE: replace with app.geospatial.fusion.fuse
from app.agents._stubs import stub_fetch_ocean_data as fetch_ocean_data
# MERGE: replace with app.connectors.imd_bulletin.fetch
from app.agents._stubs import stub_fetch_weather_hazard as fetch_weather_data
# MERGE: replace with app.geospatial.geofence.check_point
from app.agents._stubs import stub_check_geofence as check_geofence
# ==============================================================================


async def node_planner(state: AgentState) -> AgentState:
    """Planner node: entity extraction & intent classification."""
    logger.info("[LangGraph] Node: Planner")
    planned_state = await plan(
        raw_query=state.get("raw_query", ""),
        location_hint=state.get("location"),
        role=state.get("role", "fisherman"),
        language=state.get("language", "en-IN"),
    )
    return {**state, **planned_state}


async def node_fetch_domains(state: AgentState) -> AgentState:
    """Parallel Domain Fetching node: ocean, weather, and GIS."""
    logger.info("[LangGraph] Node: Parallel Domain Fetching")
    
    loc = state.get("location") or {"lat": 16.9891, "lon": 82.2475}
    lat, lon = loc.get("lat", 16.9891), loc.get("lon", 82.2475)
    time_window = state.get("time_window")
    required = state.get("required_agents", ["ocean", "weather", "gis"])

    tasks = []
    task_keys = []

    if "ocean" in required:
        tasks.append(fetch_ocean_data(lat, lon, time_window))
        task_keys.append("ocean_data")
    if "weather" in required:
        tasks.append(fetch_weather_data(lat, lon, time_window))
        task_keys.append("weather_data")
    if "gis" in required:
        tasks.append(check_geofence(lat, lon))
        task_keys.append("gis_data")

    results = await asyncio.gather(*tasks, return_exceptions=True)

    for key, res in zip(task_keys, results):
        if isinstance(res, Exception):
            logger.error(f"Domain sub-agent failed for {key}: {res}")
            state[key] = {}
        else:
            state[key] = res

    return state


async def node_guardrail(state: AgentState) -> AgentState:
    """Guardrail node: deterministic anti-hallucination verification."""
    logger.info("[LangGraph] Node: Deterministic Guardrail")
    return run_guardrail(state)


async def node_risk(state: AgentState) -> AgentState:
    """Risk engine node: TRD risk calculation & sail clearance."""
    logger.info("[LangGraph] Node: Risk & Recommendation Engine")
    return evaluate_risk_and_recommendation(state)


async def node_synthesis(state: AgentState) -> AgentState:
    """Synthesis node: grounded multilingual response generation."""
    logger.info("[LangGraph] Node: Grounded Synthesis")
    return await synthesize(state)


async def run_agent_graph(initial_state: AgentState) -> AgentState:
    """Execute the full compiled multi-agent state graph pipeline."""
    logger.info(f"Executing ORCA Agent Graph for query: '{initial_state.get('raw_query')}'")
    
    # 1. Planner Node
    state = await node_planner(initial_state)

    # 2. Clarification Short-Circuit Check
    if state.get("intent") == "clarification_needed":
        logger.info("[LangGraph] Clarification needed: Short-circuiting graph.")
        return state

    # 3. Parallel Domain Fetching Node
    state = await node_fetch_domains(state)

    # 4. Deterministic Guardrail Node
    state = await node_guardrail(state)

    # 5. Risk & Safety Recommendation Node
    state = await node_risk(state)

    # 6. Grounded Synthesis Node
    state = await node_synthesis(state)

    logger.info("Agent Graph execution completed successfully.")
    return state
