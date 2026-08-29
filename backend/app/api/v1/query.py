"""POST /api/v1/query handler.
Owner: SRIDINESH (Lead)
"""

from fastapi import APIRouter
from app.schemas.query import QueryRequest, QueryResponse, EvidenceItem

router = APIRouter(tags=["Query"])


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(req: QueryRequest) -> QueryResponse:
    """Conversational marine intelligence query entrypoint."""
    # Starter implementation matching mock contract
    return QueryResponse(
        query_id="f3a1c2e0-7b24-4f8e-9d21-9e5c6a1b2c3d",
        intent="sail_clearance",
        recommendation=f"Clear to sail east from {req.location_hint.name if req.location_hint else 'Kakinada'}, 29 Aug 06:00 IST",
        risk_score=22.0,
        risk_band="low",
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
        confidence="high",
        caveats=["Prototype risk score — not an official safety certification."],
        map_layers=["pfz", "sst_heatmap", "geofence"],
        language=req.language or "en-IN",
    )
