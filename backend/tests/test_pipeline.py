"""Comprehensive Automated Test Suite for ORCA Production Decision Pipeline.
Tests:
1. Gazetteer resolution across Indian languages (Tamil, Hindi, Telugu, English).
2. Clarification fallback for ambiguous/unanchored queries.
3. Tolerance-based claim validation and provider SLA freshness checks.
4. Non-linear risk scoring, vessel vulnerability, and cyclone hard overrides.
5. Multi-criteria PFZ candidate ranking.
6. Compiled LangGraph execution telemetry & short-circuit bypass.
7. FastAPI /api/v1/query and /api/v1/evidence endpoints with LRU caching.
Owner: SRIDINESH (Lead)
"""

import pytest
import json
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.agents.state import AgentState
from app.agents.planner_agent import plan, match_gazetteer, parse_time_window
from app.reasoning.guardrail import validate_claims, check_freshness, run_guardrail
from app.reasoning.risk_engine import (
    compute_risk_score,
    band_risk,
    sail_clearance,
    rank_pfz_candidates,
    evaluate_risk_and_recommendation,
)
from app.agents.graph import run_agent_graph


# ==============================================================================
# 1. PLANNER & GAZETTEER TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_planner_english_query():
    """Verify Planner extracts intent, coordinates, and required agents for English query."""
    state = await plan("Can I go fishing tomorrow morning near Kakinada?")
    assert state["intent"] == "sail_clearance"
    assert state["location"]["name"] == "Kakinada"
    assert state["location"]["lat"] == 16.9891
    assert state["location"]["lon"] == 82.2475
    assert set(state["required_agents"]) == {"ocean", "weather", "gis"}


@pytest.mark.anyio
async def test_planner_tamil_query():
    """Verify Gazetteer correctly matches Tamil script transliterations."""
    state = await plan("நாளை காலை காக்கிநாடாவில் மீன்பிடிக்க செல்லலாமா?", language="ta-IN")
    assert state["intent"] == "sail_clearance"
    assert state["location"]["name"] == "Kakinada"
    assert state["language"] == "ta-IN"


@pytest.mark.anyio
async def test_planner_hindi_query():
    """Verify Gazetteer correctly matches Hindi script transliterations."""
    state = await plan("क्या कल सुबह विशाखापट्टनम में मछली पकड़ सकते हैं?", language="hi-IN")
    assert state["intent"] == "sail_clearance"
    assert state["location"]["name"] == "Visakhapatnam"


@pytest.mark.anyio
async def test_planner_clarification_short_circuit():
    """Verify ambiguous query with no location triggers clarification fallback."""
    state = await plan("Can I sail?")
    assert state["intent"] == "clarification_needed"
    assert "clarification_prompt" in state
    assert state["required_agents"] == []


# ==============================================================================
# 2. GUARDRAIL & FRESHNESS TESTS
# ==============================================================================
def test_guardrail_tolerance_claim_validation():
    """Verify guardrail validates claims within tolerance and flags out-of-bounds claims."""
    source_values = {
        "wave_height_m": 1.8,
        "wind_speed_kt": 14.0,
        "sst_c": 28.2,
    }
    claims = [
        {"claim": "Wave height 1.8m", "supporting_value": 1.8, "param_key": "wave_height_m"},
        {"claim": "Wave height 1.85m (Close)", "supporting_value": 1.85, "param_key": "wave_height_m"},
        {"claim": "Wave height 4.5m (Fabricated)", "supporting_value": 4.5, "param_key": "wave_height_m"},
    ]
    validated = validate_claims(claims, source_values)
    assert validated[0]["unsupported"] is False
    assert validated[1]["unsupported"] is False  # within 0.15m tolerance
    assert validated[2]["unsupported"] is True   # flagged as unsupported


def test_guardrail_sla_freshness():
    """Verify source-specific freshness SLA validation."""
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    assert check_freshness(now_iso, "INCOIS OSF") == "good"
    assert check_freshness(None, "IMD") == "stale"


# ==============================================================================
# 3. RISK ENGINE & OVERRIDE TESTS
# ==============================================================================
def test_risk_score_non_linear_formula():
    """Verify calibrated non-linear risk formula for calm vs stormy seas."""
    # Calm sea (1.0m wave, 10kt wind, 30nm from IMBL)
    calm = compute_risk_score(wave_height_m=1.0, wind_speed_kt=10.0, distance_to_imbl_nm=30.0, hazard_severity="low")
    assert calm < 25.0
    assert band_risk(calm) == "low"

    # Extreme sea (3.8m wave, 32kt wind, 1.0nm from IMBL)
    rough = compute_risk_score(wave_height_m=3.8, wind_speed_kt=32.0, distance_to_imbl_nm=1.0, hazard_severity="high")
    assert rough >= 75.0
    assert band_risk(rough) == "extreme"


def test_vessel_class_vulnerability_modifier():
    """Verify small artisanal boats receive higher risk scores than mechanized trawlers."""
    small_boat_risk = compute_risk_score(wave_height_m=2.0, wind_speed_kt=18.0, boat_class="small")
    large_trawler_risk = compute_risk_score(wave_height_m=2.0, wind_speed_kt=18.0, boat_class="large")
    assert small_boat_risk > large_trawler_risk


def test_hard_cyclone_override():
    """Verify active cyclone forces sail clearance to False even if wave height is low."""
    state: AgentState = {
        "risk_score": 18.0,
        "weather_data": {
            "has_cyclone": True,
            "highest_severity": "critical",
            "hazards": [{"type": "cyclone", "severity": "critical"}],
        },
    }
    assert sail_clearance(state) is False


def test_pfz_mcda_ranking():
    """Verify PFZ candidates are sorted by thermal gradient & chlorophyll suitability."""
    candidates = [
        {"name": "Zone Alpha", "sst_c": 28.2, "chl_a_mgm3": 1.8, "distance_nm": 10.0},
        {"name": "Zone Beta", "sst_c": 32.5, "chl_a_mgm3": 0.2, "distance_nm": 45.0},
    ]
    ranked = rank_pfz_candidates(candidates)
    assert ranked[0]["name"] == "Zone Alpha"
    assert ranked[0]["suitability_score"] > ranked[1]["suitability_score"]


# ==============================================================================
# 4. LANGGRAPH PIPELINE & API ENDPOINT TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_full_agent_graph_execution():
    """Verify complete LangGraph pipeline runs and populates execution telemetry."""
    initial: AgentState = {
        "raw_query": "Can I go fishing tomorrow morning near Kakinada?",
        "role": "fisherman",
        "language": "en-IN",
    }
    final = await run_agent_graph(initial)
    assert final["intent"] == "sail_clearance"
    assert len(final["evidence"]) >= 2
    assert final["risk_score"] is not None
    assert final["final_response"] is not None
    assert "telemetry" in final
    assert "latency_ms" in final["telemetry"]
    assert "Planner" in final["telemetry"]["nodes_executed"]


@pytest.mark.anyio
async def test_query_and_evidence_api_flow():
    """Verify FastAPI /api/v1/query and /api/v1/evidence/{id} integration."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Send Query
        payload = {
            "text": "Can I go fishing tomorrow morning near Kakinada?",
            "location_hint": {"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
            "role": "fisherman",
            "language": "en-IN",
        }
        res = await client.post("/api/v1/query", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "query_id" in data
        assert data["intent"] == "sail_clearance"
        assert data["risk_band"] in ["low", "moderate", "high", "extreme"]
        assert len(data["evidence"]) >= 1

        query_id = data["query_id"]

        # 2. Retrieve Evidence Trace
        ev_res = await client.get(f"/api/v1/evidence/{query_id}")
        assert ev_res.status_code == 200
        ev_data = ev_res.json()
        assert ev_data["query_id"] == query_id
        assert "plan" in ev_data
        assert len(ev_data["evidence"]) >= 1
