"""Unit Tests for Specialized Agents in LangGraph (SIH26176).
Tests:
- WeatherIntelligenceAgent
- OceanAnalyticsAgent
- GeospatialNavigationAgent
- CriticAuditorAgent
- Full Graph with Specialized Agents & Critic Reflection
"""

import pytest
import pytest_asyncio
from app.agents.weather_agent import WeatherIntelligenceAgent
from app.agents.ocean_agent import OceanAnalyticsAgent
from app.agents.navigation_agent import GeospatialNavigationAgent
from app.agents.critic_agent import CriticAuditorAgent
from app.agents.graph import run_agent_graph
from app.agents.state import AgentState, WeatherTelemetry, OceanTelemetry, GisTelemetry


def test_weather_intelligence_agent():
    """Verify weather hazard detection, gale warning, and risk index scoring."""
    mock_weather: WeatherTelemetry = {
        "hazards": [
            {
                "type": "gale",
                "severity": "high",
                "headline": "Squally winds 30-35 knots expected along Andhra coast",
                "valid_from": "2026-09-01T00:00:00Z",
                "source": "IMD",
            }
        ],
        "has_cyclone": False,
        "highest_severity": "high",
        "source": "IMD",
        "fetched_at": "2026-09-01T06:00:00Z",
    }

    result = WeatherIntelligenceAgent.analyze(
        weather_data=mock_weather,
        location={"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
        wind_speed_kt=32.0,
    )

    assert result["agent_name"] == "WeatherIntelligenceAgent"
    assert result["is_squall_alert"] is True
    assert result["is_cyclone_alert"] is False
    assert result["weather_risk_index"] >= 50.0
    assert len(result["weather_caveats"]) > 0


def test_ocean_analytics_agent_pfz_and_anomaly():
    """Verify PFZ suitability calculation, thermal front detection, and species classification."""
    mock_ocean: OceanTelemetry = {
        "lat": 16.9891,
        "lon": 82.2475,
        "valid_time": "2026-09-01T06:00:00Z",
        "fetched_at": "2026-09-01T06:00:00Z",
        "sst_c": 28.2,
        "chl_a_mgm3": 0.55,
        "wave_height_m": 1.2,
        "wind_speed_kt": 10.5,
        "source_map": {},
        "quality": "high",
    }

    result = OceanAnalyticsAgent.analyze(
        ocean_data=mock_ocean,
        location={"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
    )

    assert result["agent_name"] == "OceanAnalyticsAgent"
    assert result["is_thermal_front_present"] is True
    assert result["pfz_suitability_score"] > 0.4
    assert "Yellowfin Tuna (Thunnus albacares)" in result["target_species"]
    assert "Indian Mackerel (Rastrelliger kanagurta)" in result["target_species"]


def test_geospatial_navigation_agent_avoidance():
    """Verify MPA sanctuary avoidance and IMBL proximity evaluation."""
    mock_gis: GisTelemetry = {
        "zones": [{"name": "Coringa Marine Wildlife Sanctuary", "zone_type": "MPA"}],
        "distance_to_imbl_nm": 3.5,
        "nearest_boundary_name": "IMBL_Sector",
        "is_inside_restricted": True,
        "restricted_zone_names": ["Coringa Marine Wildlife Sanctuary"],
        "source": "PostGIS",
    }

    result = GeospatialNavigationAgent.analyze(
        gis_data=mock_gis,
        location={"lat": 16.85, "lon": 82.30, "name": "Coringa"},
        wave_height_m=1.5,
    )

    assert result["agent_name"] == "GeospatialNavigationAgent"
    assert result["navigation_status"] == "FORBIDDEN"
    assert result["imbl_buffer_status"] == "WARNING"
    assert "Coringa" in (result["avoidance_reason"] or "")


def test_critic_auditor_agent_contradiction_correction():
    """Verify Critic agent catches and corrects contradictory safe-sailing claims under extreme risk."""
    state: AgentState = {
        "query_id": "test-critic-123",
        "raw_query": "Is it safe to sail?",
        "role": "fisherman",
        "language": "en-IN",
        "intent": "sail_clearance",
        "risk_score": 88.5,
        "risk_band": "extreme",
        "sail_allowed": False,
        "cyclone_override_active": True,
        "recommendation": "Conditions are safe to venture into sea tomorrow morning.",
        "final_response": "Conditions are safe to venture into sea tomorrow morning.",
        "evidence": [],
    }

    audited_state = CriticAuditorAgent.audit(state)
    audit = audited_state["critic_audit"]

    assert audit["audit_passed"] is False
    assert audit["contradiction_detected"] is True
    assert "SAFETY OVERRIDE" in audited_state["recommendation"]
    assert "NOT advised" in audited_state["recommendation"]


@pytest.mark.asyncio
async def test_full_graph_with_specialized_agents():
    """Verify full LangGraph run visits Specialized_Domain_Agents and Critic_Auditor nodes."""
    initial: AgentState = {
        "query_id": "test-specialized-flow",
        "raw_query": "Where is the nearest Potential Fishing Zone from Kakinada?",
        "role": "fisherman",
        "language": "en-IN",
        "location": {"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
    }

    result = await run_agent_graph(initial)

    telemetry = result.get("telemetry") or {}
    nodes = telemetry.get("nodes_executed", [])

    assert "Planner" in nodes
    assert "Specialized_Domain_Agents" in nodes
    assert "Guardrail" in nodes
    assert "Risk_Engine" in nodes
    assert "Synthesis" in nodes
    assert "Critic_Auditor" in nodes

    assert result.get("weather_intelligence") is not None
    assert result.get("ocean_analytics") is not None
    assert result.get("navigation_intelligence") is not None
    assert result.get("critic_audit") is not None
    assert result["critic_audit"]["agent_name"] == "CriticAuditorAgent"
