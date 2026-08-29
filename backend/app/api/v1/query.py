"""POST /api/v1/query Endpoint Handler.
Executes the LangGraph reasoning workflow and returns structured recommendations.
Owner: SRIDINESH (Lead)
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.schemas.query import QueryRequest, QueryResponse, EvidenceItem
from app.agents.graph import run_agent_graph
from app.agents.state import AgentState
from app.reasoning.evidence import build_evidence_trace
from app.core.logging import logger

router = APIRouter(tags=["Query"])

# In-memory query log store for development and fast retrieval
# MERGE: Sridinesh writes to Charan's PostgreSQL query_logs table once Supabase is connected
QUERY_TRACE_STORE: Dict[str, Dict[str, Any]] = {}


@router.post("/query", response_model=QueryResponse)
async def query_marine_intelligence(req: QueryRequest) -> QueryResponse:
    """Execute natural language marine decision support query."""
    query_id = str(uuid.uuid4())
    logger.info(f"Received query request [{query_id}]: '{req.text}' (role={req.role}, lang={req.language})")

    location_dict = None
    if req.location_hint:
        location_dict = {
            "lat": req.location_hint.lat,
            "lon": req.location_hint.lon,
            "name": req.location_hint.name or "Detected Location",
        }

    initial_state: AgentState = {
        "query_id": query_id,
        "raw_query": req.text,
        "role": req.role or "fisherman",
        "language": req.language or "en-IN",
        "location": location_dict,
    }

    try:
        final_state = await run_agent_graph(initial_state)
    except Exception as e:
        logger.error(f"Error during agent graph execution: {e}")
        raise HTTPException(
            status_code=500, detail="An error occurred while analyzing marine data."
        )

    evidence_items = build_evidence_trace(final_state)
    created_at = datetime.now(timezone.utc).isoformat()

    # Store in trace cache for audit retrieval
    QUERY_TRACE_STORE[query_id] = {
        "query_id": query_id,
        "raw_query": req.text,
        "plan": {
            "intent": final_state.get("intent", "general_query"),
            "location": final_state.get("location"),
            "required_agents": final_state.get("required_agents", []),
        },
        "evidence": [e.model_dump() for e in evidence_items],
        "created_at": created_at,
        "role": req.role or "fisherman",
    }

    # MERGE: Insert into PostgreSQL query_logs table (Charan's schema)

    return QueryResponse(
        query_id=query_id,
        intent=final_state.get("intent", "general_query"),
        recommendation=final_state.get(
            "final_response", final_state.get("recommendation", "Advisory unavailable")
        ),
        risk_score=final_state.get("risk_score"),
        risk_band=final_state.get("risk_band"),
        evidence=evidence_items,
        confidence=final_state.get("confidence", "high"),
        caveats=final_state.get("caveats", []),
        map_layers=final_state.get("map_layers", ["pfz", "sst_heatmap", "geofence"]),
        language=final_state.get("language", "en-IN"),
    )
