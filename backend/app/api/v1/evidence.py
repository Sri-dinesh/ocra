"""GET /api/v1/evidence/{query_id} Endpoint Handler.
Retrieves full audit evidence traces for past queries.
Owner: SRIDINESH (Lead)
"""

from fastapi import APIRouter, HTTPException
from app.schemas.query import EvidenceDetailResponse, EvidenceItem
from app.api.v1.query import QUERY_TRACE_STORE

router = APIRouter(tags=["Evidence"])


@router.get("/evidence/{query_id}", response_model=EvidenceDetailResponse)
async def get_evidence_trace(query_id: str) -> EvidenceDetailResponse:
    """Retrieve full audit evidence trail for a specific query ID."""
    trace = QUERY_TRACE_STORE.get(query_id)

    # Fallback to default mock trace if requesting demo/sample query ID
    if not trace:
        if query_id == "f3a1c2e0-7b24-4f8e-9d21-9e5c6a1b2c3d":
            return EvidenceDetailResponse(
                query_id=query_id,
                raw_query="Can I go fishing tomorrow morning near Kakinada?",
                plan={
                    "intent": "sail_clearance",
                    "location": {"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
                    "required_agents": ["ocean", "weather", "gis"],
                },
                evidence=[
                    EvidenceItem(
                        claim="Wave height 1.8m",
                        source="INCOIS OSF",
                        fetched_at="2026-08-28T22:10:00+05:30",
                    ),
                    EvidenceItem(
                        claim="No active cyclone bulletin for this cell",
                        source="IMD",
                        fetched_at="2026-08-28T21:00:00+05:30",
                    ),
                ],
                created_at="2026-08-28T22:11:03+05:30",
            )
        raise HTTPException(
            status_code=404, detail=f"No evidence trace found for query_id '{query_id}'"
        )

    evidence_items = [
        EvidenceItem(
            claim=e.get("claim", ""),
            source=e.get("source", "INCOIS/IMD"),
            fetched_at=e.get("fetched_at", ""),
            supporting_value=e.get("supporting_value"),
        )
        for e in trace.get("evidence", [])
    ]

    return EvidenceDetailResponse(
        query_id=trace["query_id"],
        raw_query=trace["raw_query"],
        plan=trace["plan"],
        evidence=evidence_items,
        created_at=trace["created_at"],
    )
