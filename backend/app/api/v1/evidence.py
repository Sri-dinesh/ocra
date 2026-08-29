"""GET /api/v1/evidence/{query_id} handler.
Owner: SRIDINESH (Lead)
"""

from fastapi import APIRouter, HTTPException
from app.schemas.query import EvidenceDetailResponse, EvidenceItem

router = APIRouter(tags=["Evidence"])


@router.get("/evidence/{query_id}", response_model=EvidenceDetailResponse)
async def get_evidence(query_id: str) -> EvidenceDetailResponse:
    """Retrieve full audit evidence trace for a previous query."""
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
