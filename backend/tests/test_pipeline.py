"""Comprehensive automated test suite for ORCA Lead Track Reasoning Pipeline.
Tests: Planner Agent, Deterministic Guardrail, Risk Engine, LangGraph workflow, and API routes.
Owner: SRIDINESH (Lead)
"""

import pytest
import json
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.agents.state import AgentState
from app.agents.planner_agent import plan
from app.reasoning.guardrail import validate_claims, check_freshness, run_guardrail
from app.reasoning.risk_engine import (
    compute_risk_score,
    band_risk,
    sail_clearance,
    rank_pfz_candidates,
    evaluate_risk_and_recommendation,
)
from app.agents.graph import run_agent_graph


@pytest.mark.asyncio
async def test_planner_entity_extraction():
    """Verify Planner Agent extracts intent, location, and required agents."""
    state = await plan("Can I go fishing tomorrow morning near Kakinada?")
    assert state["intent"] == "sail_clearance"
    assert state["location"]["name"] == "Kakinada"
    assert "ocean" in state["required_agents"]
    assert "weather" in state["required_agents"]
    assert "gis" in state["required_agents"]


@pytest.mark.asyncio
async def test_planner_clarification_fallback():
    """Verify ambiguous query with no location triggers clarification fallback."""
    state = await plan("Can I sail?")
    assert state["intent"] == "clarification_needed"
    assert "clarification_prompt" in state
    assert state["required_agents"] == []


def test_guardrail_numeric_claim_validation():
    """Verify guardrail rejects or flags fabricated numbers."""
    source_values = {"wave_height_m": 1.8, "wind_speed_kt": 14.0}
    claims = [
        {"claim": "Wave height 1.8m", "supporting_value": 1.8},
        {"claim": "Wave height 5.5m (Fabricated)", "supporting_value": 5.5},
    ]
    validated = validate_claims(claims, source_values)
    assert validated[0].get("unsupported") is None
    assert validated[1].get("unsupported") is True


def test_guardrail_freshness_check():
    """Verify freshness check correctly flags timestamps."""
    assert check_freshness("2026-08-29T06:00:00+05:30") == "good"
    assert check_freshness(None) == "stale"


def test_risk_score_calculation():
    """Verify weighted risk formula produces calibrated scores."""
    # Calm sea
    calm_score = compute_risk_score(wave_height_m=1.0, wind_speed_kt=10.0, distance_to_imbl_nm=30.0)
    assert calm_score < 30.0
    assert band_risk(calm_score) in ["low", "moderate"]

    # Rough sea
    rough_score = compute_risk_score(wave_height_m=3.5, wind_speed_kt=28.0, distance_to_imbl_nm=1.5)
    assert rough_score > 70.0
    assert band_risk(rough_score) in ["high", "extreme"]


def test_hard_cyclone_override():
    """Verify active cyclone forces sail clearance to False regardless of risk score."""
    state: AgentState = {
        "risk_score": 15.0,  # Low score
        "weather_data": {
            "has_cyclone": True,
            "highest_severity": "critical",
            "hazards": [{"type": "cyclone", "severity": "critical"}],
        },
    }
    # Cyclone override must deny sail clearance
    assert sail_clearance(state) is False


def test_pfz_ranking():
    """Verify PFZ candidates are ranked best-first with reasons."""
    candidates = [
        {"name": "Zone A", "sst_c": 28.2, "chl_a_mgm3": 1.5, "distance_nm": 8.0},
        {"name": "Zone B", "sst_c": 32.0, "chl_a_mgm3": 0.2, "distance_nm": 40.0},
    ]
    ranked = rank_pfz_candidates(candidates)
    assert ranked[0]["name"] == "Zone A"
    assert "ranking_reason" in ranked[0]


@pytest.mark.asyncio
async def test_full_agent_graph_execution():
    """Verify full LangGraph pipeline executes smoothly from query to response."""
    initial: AgentState = {
        "raw_query": "Can I go fishing tomorrow morning near Kakinada?",
        "role": "fisherman",
        "language": "en-IN",
    }
    final = await run_agent_graph(initial)
    assert final["intent"] == "sail_clearance"
    assert len(final["evidence"]) > 0
    assert final["risk_score"] is not None
    assert final["final_response"] is not None


@pytest.mark.asyncio
async def test_query_and_evidence_api_endpoints():
    """Verify FastAPI /api/v1/query and /api/v1/evidence/{id} work end-to-end."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. POST /query
        payload = {
            "text": "Can I go fishing tomorrow morning near Kakinada?",
            "location_hint": {"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
            "role": "fisherman",
            "language": "en-IN",
        }
        res = await ac.post("/api/v1/query", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "query_id" in data
        assert data["intent"] == "sail_clearance"
        assert len(data["evidence"]) >= 1
        assert "recommendation" in data

        query_id = data["query_id"]

        # 2. GET /evidence/{query_id}
        ev_res = await ac.get(f"/api/v1/evidence/{query_id}")
        assert ev_res.status_code == 200
        ev_data = ev_res.json()
        assert ev_data["query_id"] == query_id
        assert "plan" in ev_data
        assert len(ev_data["evidence"]) >= 1
