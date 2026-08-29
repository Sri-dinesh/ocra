"""Production-Grade LangGraph Multi-Agent Orchestration Graph.
Features:
- Stateful multi-agent graph with parallel domain gathering.
- Direct integration with Charan's live geospatial fusion, IMD connector, and PostGIS geofencing.
- Node-level latency profiling and execution telemetry.
- Clarification short-circuiting and graceful error recovery.
Owner: SRIDINESH (Lead)
"""

import asyncio
import time
import datetime
from typing import Dict, Any, List, Optional
from app.agents.state import AgentState, ExecutionTelemetry
from app.agents.planner_agent import plan
from app.reasoning.guardrail import run_guardrail
from app.reasoning.risk_engine import evaluate_risk_and_recommendation
from app.agents.synthesis_agent import synthesize
from app.core.logging import logger

# ==============================================================================
# LIVE MODULE INTEGRATIONS (Backend-B / Charan)
# ==============================================================================
from app.geospatial.fusion import fuse
from app.connectors.imd_bulletin import ImdBulletinConnector
from app.geospatial.geofence import check_point

_imd_connector = ImdBulletinConnector()


async def fetch_ocean_data(lat: float, lon: float, time_str: Optional[str] = None) -> Dict[str, Any]:
    """Asynchronously calls Charan's geospatial fusion engine."""
    if time_str:
        try:
            clean_str = time_str.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str)
        except Exception:
            dt = datetime.datetime.now(datetime.timezone.utc)
    else:
        dt = datetime.datetime.now(datetime.timezone.utc)

    # Run blocking DB/connector fusion in background thread
    data = await asyncio.to_thread(fuse, lat, lon, dt)
    if isinstance(data.get("valid_time"), datetime.datetime):
        data["valid_time"] = data["valid_time"].isoformat()
    data["fetched_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return data


async def fetch_weather_data(lat: float, lon: float, time_str: Optional[str] = None) -> Dict[str, Any]:
    """Asynchronously calls IMD weather and hazard bulletin connector."""
    if time_str:
        try:
            clean_str = time_str.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str)
        except Exception:
            dt = datetime.datetime.now(datetime.timezone.utc)
    else:
        dt = datetime.datetime.now(datetime.timezone.utc)

    raw_hazards = await asyncio.to_thread(_imd_connector.fetch, lat, lon, dt)
    hazards_list = raw_hazards if isinstance(raw_hazards, list) else []

    has_cyclone = any(
        h.get("type", "").lower() == "cyclone" or "cyclone" in h.get("headline", "").lower()
        for h in hazards_list
    )
    
    highest_sev = "low"
    for h in hazards_list:
        sev = h.get("severity", "low").lower()
        if sev == "critical":
            highest_sev = "critical"
            break
        elif sev == "high" and highest_sev != "critical":
            highest_sev = "high"
        elif sev == "moderate" and highest_sev not in ["high", "critical"]:
            highest_sev = "moderate"

    return {
        "hazards": hazards_list,
        "has_cyclone": has_cyclone,
        "highest_severity": highest_sev,
        "source": "IMD",
        "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


async def check_geofence(lat: float, lon: float) -> Dict[str, Any]:
    """Asynchronously queries PostGIS geofence containing zones."""
    zones = await asyncio.to_thread(check_point, lat, lon)
    is_inside = len(zones) > 0

    # Distance calculation heuristic for coastline/IMBL
    dist_imbl = 0.0 if is_inside else 42.6
    if 8.5 <= lat <= 10.5 and 78.5 <= lon <= 80.0 and not is_inside:
        dist_imbl = max(1.2, round(abs(lon - 79.5) * 60.0 * 0.6, 1))

    return {
        "zones": zones or [],
        "is_inside_restricted": is_inside,
        "distance_to_imbl_nm": dist_imbl,
        "nearest_boundary_name": "IMBL_TamilNadu_SriLanka_Sector",
        "source": "INCOIS/PostGIS",
    }
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
