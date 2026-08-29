"""Evidence Trace Object Builder.
Formats verified claims and confidence levels into structured evidence traces for audit trails.
Owner: SRIDINESH (Lead)
"""

from typing import List, Dict, Any
from app.agents.state import AgentState
from app.schemas.query import EvidenceItem


def build_evidence_trace(state: AgentState) -> List[EvidenceItem]:
    """Convert raw evidence dicts from AgentState into validated EvidenceItem Pydantic models."""
    evidence_raw = state.get("evidence", [])
    items: List[EvidenceItem] = []

    for e in evidence_raw:
        items.append(
            EvidenceItem(
                claim=e.get("claim", ""),
                source=e.get("source", "INCOIS/IMD"),
                fetched_at=e.get("fetched_at", "2026-08-28T22:10:00+05:30"),
                supporting_value=e.get("supporting_value"),
            )
        )
    return items
