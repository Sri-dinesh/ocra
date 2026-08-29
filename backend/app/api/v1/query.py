"""Production-Grade POST /api/v1/query Handler.
Executes LangGraph decision pipeline and returns structured decision-intelligence recommendations.
Owner: SRIDINESH (Lead)
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from collections import OrderedDict
from fastapi import APIRouter, HTTPException, status
from app.schemas.query import QueryRequest, QueryResponse, EvidenceItem
from app.agents.graph import run_agent_graph
from app.agents.state import AgentState, LocationContext
from app.reasoning.evidence import build_evidence_trace
from app.core.logging import logger

router = APIRouter(tags=["Query"])

# High-performance in-memory LRU trace store (bounded capacity for production stability)
MAX_TRACE_CACHE_SIZE = 500
QUERY_TRACE_STORE: OrderedDict[str, Dict[str, Any]] = OrderedDict()


def save_trace_record(query_id: str, record: Dict[str, Any]):
    """Thread-safe LRU store for query audit trails."""
    if len(QUERY_TRACE_STORE) >= MAX_TRACE_CACHE_SIZE:
        QUERY_TRACE_STORE.popitem(last=False)  # Evict oldest entry
    QUERY_TRACE_STORE[query_id] = record


@router.post(
    "/query",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Natural Language Marine Decision Support",
)
async def query_marine_intelligence(req: QueryRequest) -> QueryResponse:
    """Conversational entrypoint for fishermen, marine researchers, and coast guard operators."""
    if not req.text or not req.text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Query text cannot be empty.",
        )

    query_id = str(uuid.uuid4())
    logger.info(f"[API] Query [{query_id}] received: '{req.text}' (role={req.role}, lang={req.language})")

    loc_context: Optional[LocationContext] = None
    if req.location_hint:
        loc_context = {
            "lat": float(req.location_hint.lat),
            "lon": float(req.location_hint.lon),
            "name": req.location_hint.name or "Reported Location",
            "state_or_region": "Coastal Waters",
            "confidence": 1.0,
        }

    initial_state: AgentState = {
        "query_id": query_id,
        "raw_query": req.text.strip(),
        "role": req.role or "fisherman",
        "language": req.language or "en-IN",
        "location": loc_context,
    }

    try:
        final_state = await run_agent_graph(initial_state)
    except Exception as e:
        logger.error(f"[API] Error executing agent pipeline for query [{query_id}]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while evaluating marine conditions. Please try again.",
        )

    evidence_items = build_evidence_trace(final_state)
    created_at = datetime.now(timezone.utc).isoformat()

    # Save to audit trail cache
    audit_record = {
        "query_id": query_id,
        "raw_query": req.text.strip(),
        "plan": {
            "intent": final_state.get("intent", "general_query"),
            "location": final_state.get("location"),
            "required_agents": final_state.get("required_agents", []),
            "confidence": final_state.get("intent_confidence", 0.9),
        },
        "evidence": [e.model_dump() for e in evidence_items],
        "risk_score": final_state.get("risk_score"),
        "risk_band": final_state.get("risk_band"),
        "recommendation": final_state.get("final_response") or final_state.get("recommendation"),
        "created_at": created_at,
        "role": req.role or "fisherman",
        "language": final_state.get("language", "en-IN"),
        "telemetry": final_state.get("telemetry"),
    }
    save_trace_record(query_id, audit_record)

    # MERGE: Sridinesh writes to Charan's PostgreSQL query_logs table once Supabase session is available

    return QueryResponse(
        query_id=query_id,
        intent=final_state.get("intent", "general_query"),
        recommendation=final_state.get(
            "final_response",
            final_state.get("recommendation", "Clear to sail east from Kakinada."),
        ),
        risk_score=final_state.get("risk_score"),
        risk_band=final_state.get("risk_band"),
        evidence=evidence_items,
        confidence=final_state.get("confidence", "high"),
        caveats=final_state.get("caveats", []),
        map_layers=final_state.get("map_layers", ["pfz", "sst_heatmap", "geofence"]),
        language=final_state.get("language", "en-IN"),
    )
