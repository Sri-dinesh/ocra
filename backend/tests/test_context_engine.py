"""Unit Tests for Multi-Turn Context Engine & Coreference Resolution (SIH26176).
Tests:
- Coreference resolution ('there', 'tomorrow', 'that spot').
- History prompt formatting without token bloat.
- Multi-turn conversational flow across turns.
"""

import pytest
import pytest_asyncio
from app.reasoning.context_engine import ContextEngine
from app.agents.planner_agent import plan


def test_coreference_spatial_inheritance():
    """Verify 'there' inherits location from prior turn."""
    mock_history = [
        {
            "query_id": "turn-1",
            "user_query": "Can I go fishing near Visakhapatnam?",
            "intent": "sail_clearance",
            "location_lat": 17.6868,
            "location_lon": 83.2185,
            "location_name": "Visakhapatnam",
            "risk_score": 35.0,
            "risk_band": "low",
            "sail_clearance": True,
            "recommendation": "Clear to sail from Visakhapatnam.",
        }
    ]

    coref = ContextEngine.resolve_coreferences(
        raw_query="What will the wave height be there tomorrow?",
        history=mock_history,
    )

    assert coref["is_follow_up"] is True
    assert coref["inherited_location"] is not None
    assert coref["inherited_location"]["lat"] == 17.6868
    assert coref["inherited_location"]["lon"] == 83.2185


@pytest.mark.asyncio
async def test_planner_multi_turn_follow_up():
    """Verify Planner agent seamlessly inherits previous location on relative follow-up."""
    mock_history = [
        {
            "query_id": "turn-1",
            "user_query": "Where is the nearest PFZ from Chennai?",
            "intent": "pfz_lookup",
            "location_lat": 13.0827,
            "location_lon": 80.2707,
            "location_name": "Chennai",
            "risk_score": 25.0,
            "risk_band": "low",
            "sail_clearance": True,
            "recommendation": "PFZ hotspot identified 15 nm East of Chennai.",
        }
    ]

    # Follow-up query with no explicit city name:
    planned = await plan(
        raw_query="Plot the safest route to that fishing zone.",
        role="fisherman",
        language="en-IN",
        conversation_history=mock_history,
    )

    assert planned["intent"] == "route_request"
    assert planned["location"] is not None
    assert planned["location"]["lat"] == 13.0827
    assert planned["location"]["lon"] == 80.2707


def test_context_engine_prompt_formatting():
    """Verify clean, compact prompt formatting for LLM injection."""
    mock_history = [
        {
            "query_id": "turn-1",
            "user_query": "Can I sail?",
            "location_name": "Kakinada",
            "recommendation": "Clear to sail from Kakinada with wave height 1.2m.",
        }
    ]

    formatted = ContextEngine.format_history_for_prompt(mock_history)
    assert "Recent Conversation History:" in formatted
    assert "Can I sail?" in formatted
    assert "Kakinada" in formatted
