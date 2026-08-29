"""Production-Grade LangGraph Multi-Agent Orchestration Graph.
Features:
- Stateful multi-agent graph with parallel domain gathering.
- Node-level latency profiling and execution telemetry.
- Clarification short-circuiting and graceful error recovery.
- Clearly marked '# MERGE:' swap boundaries for Charan's modules.
Owner: SRIDINESH (Lead)
"""

import asyncio
import time
from typing import Dict, Any, List
from app.agents.state import AgentState, ExecutionTelemetry
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
    """Planner Node: Multi-entity extraction and operational routing."""
    logger.info("[LangGraph] Executing Node: Planner")
    planned = await plan(
        raw_query=state.get("raw_query", ""),
        location_hint=state.get("location"),
        role=state.get("role", "fisherman"),
        language=state.get("language", "en-IN"),
    )
    return {**state, **planned}


async def node_parallel_domains(state: AgentState) -> AgentState:
    """Parallel Domain Sub-Agent Gathering Node."""
    logger.info("[LangGraph] Executing Node: Parallel Domain Agents")
    
    loc = state.get("location") or {"lat": 16.9891, "lon": 82.2475}
    lat, lon = float(loc.get("lat", 16.9891)), float(loc.get("lon", 82.2475))
    time_ctx = state.get("time_window") or {}
    raw_time = time_ctx.get("target_start_iso")
    required = state.get("required_agents", ["ocean", "weather", "gis"])

    tasks: List[Any] = []
    task_keys: List[str] = []

    if "ocean" in required:
        tasks.append(fetch_ocean_data(lat, lon, raw_time))
        task_keys.append("ocean_data")
    if "weather" in required:
        tasks.append(fetch_weather_data(lat, lon, raw_time))
        task_keys.append("weather_data")
    if "gis" in required:
        tasks.append(check_geofence(lat, lon))
        task_keys.append("gis_data")

    # Concurrent fetch with timeout guard
    try:
        results = await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True),
            timeout=10.0
        )
    except asyncio.TimeoutError:
        logger.error("[LangGraph] Domain gathering timed out after 10s. Degraded mode active.")
        results = [None] * len(tasks)

    for key, res in zip(task_keys, results):
        if isinstance(res, Exception) or res is None:
            logger.warning(f"[LangGraph] Sub-agent failed for '{key}': {res}. Populating degraded state.")
            state[key] = {}
        else:
            state[key] = res

    return state


async def node_guardrail(state: AgentState) -> AgentState:
    """Deterministic Guardrail Node: Hard verification gate."""
    logger.info("[LangGraph] Executing Node: Deterministic Guardrail")
    return run_guardrail(state)


async def node_risk(state: AgentState) -> AgentState:
    """Risk & Recommendation Engine Node."""
    logger.info("[LangGraph] Executing Node: Risk & Safety Recommendation")
    return evaluate_risk_and_recommendation(state)


async def node_synthesis(state: AgentState) -> AgentState:
    """Grounded Synthesis Node."""
    logger.info("[LangGraph] Executing Node: Grounded Multilingual Synthesis")
    return await synthesize(state)


async def run_agent_graph(initial_state: AgentState) -> AgentState:
    """Compiled Agent Workflow Orchestration Pipeline."""
    start_epoch = time.perf_counter()
    nodes_visited: List[str] = []
    
    state = dict(initial_state)
    logger.info(f"[LangGraph] Workflow started for query: '{state.get('raw_query')}'")

    # Step 1: Planner Node
    nodes_visited.append("Planner")
    state = await node_planner(state)

    # Step 2: Disambiguation Short-Circuit Check
    if state.get("intent") == "clarification_needed":
        logger.info("[LangGraph] Short-circuiting workflow: Clarification needed from user.")
        nodes_visited.append("Clarification_Exit")
        end_epoch = time.perf_counter()
        state["telemetry"] = {
            "start_time_epoch": start_epoch,
            "end_time_epoch": end_epoch,
            "latency_ms": round((end_epoch - start_epoch) * 1000.0, 2),
            "nodes_executed": nodes_visited,
        }
        return state

    # Step 3: Concurrent Domain Agents
    nodes_visited.append("Domain_Gathering")
    state = await node_parallel_domains(state)

    # Step 4: Deterministic Guardrail Gate
    nodes_visited.append("Guardrail")
    state = await node_guardrail(state)

    # Step 5: Risk & Recommendation
    nodes_visited.append("Risk_Engine")
    state = await node_risk(state)

    # Step 6: Grounded Synthesis
    nodes_visited.append("Synthesis")
    state = await node_synthesis(state)

    end_epoch = time.perf_counter()
    latency_ms = round((end_epoch - start_epoch) * 1000.0, 2)
    
    state["telemetry"] = {
        "start_time_epoch": start_epoch,
        "end_time_epoch": end_epoch,
        "latency_ms": latency_ms,
        "nodes_executed": nodes_visited,
    }

    logger.info(f"[LangGraph] Workflow completed in {latency_ms}ms across nodes: {nodes_visited}")
    return state
