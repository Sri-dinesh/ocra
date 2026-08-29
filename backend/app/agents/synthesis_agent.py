"""Synthesis Agent - Grounded Natural Language & Multilingual Response Generation.
Owner: SRIDINESH (Lead)
"""

from app.agents.state import AgentState
from app.core.logging import logger


async def synthesize(state: AgentState) -> AgentState:
    """Generate final grounded response from verified evidence only."""
    logger.info("Synthesizing response from evidence...")
    # TODO (SRIDINESH): Implement Gemini grounded synthesis prompt in Phase 5
    state["final_response"] = state.get(
        "recommendation", "Clear to sail east from Kakinada, 29 Aug 06:00 IST"
    )
    return state
