"""Production-Grade GET /api/v1/evidence/{query_id} Handler.
Retrieves full explainability audit trails for prior marine queries from memory and relational database.
Owner: SRIDINESH (Lead)
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.schemas.query import EvidenceDetailResponse, EvidenceItem
from app.api.v1.query import QUERY_TRACE_STORE
from app.db.session import SessionLocal
from app.models.query_log import QueryLog
from app.models.plan_step import PlanStep
from app.models.evidence_item import EvidenceItem as EvidenceItemModel

router = APIRouter(tags=["Evidence"])


@router.get(
    "/evidence/{query_id}",
    response_model=EvidenceDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve Explainability Audit Trace",
)
async def get_evidence_trace(query_id: str) -> EvidenceDetailResponse:
    """Retrieve full audit evidence trail for a specific query ID.
    Used for 'Show the Math' judge auditing and regulatory compliance.
    """
    clean_id = query_id.strip()
    trace = QUERY_TRACE_STORE.get(clean_id)

    # 1. Retrieve from in-memory trace store if present
    if trace:
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

    # 2. Retrieve from durable relational database (QueryLog, PlanStep, EvidenceItem)
    db = SessionLocal()
    try:
        q_uuid = uuid.UUID(clean_id)
        q_log = db.query(QueryLog).filter(QueryLog.id == q_uuid).first()
        if q_log:
            db_steps = db.query(PlanStep).filter(PlanStep.query_log_id == q_uuid).order_by(PlanStep.step_order).all()
            db_ev = db.query(EvidenceItemModel).filter(EvidenceItemModel.query_log_id == q_uuid).all()

            evidence_items = [
                EvidenceItem(
                    claim=item.claim_text,
                    source=item.source.display_name if item.source else "Verified Marine Observation",
                    fetched_at=item.fetched_at.isoformat() if item.fetched_at else q_log.created_at.isoformat(),
                    supporting_value=item.supporting_value,
                )
                for item in db_ev
            ]

            plan_dict = {
                "intent": q_log.intent,
                "location": {
                    "lat": q_log.location_lat,
                    "lon": q_log.location_lon,
                },
                "steps": [s.agent_name for s in db_steps],
                "risk_score": q_log.risk_score,
                "risk_band": q_log.risk_band,
                "sail_clearance": q_log.sail_clearance,
            }

            return EvidenceDetailResponse(
                query_id=str(q_log.id),
                raw_query=q_log.raw_query,
                plan=plan_dict,
                evidence=evidence_items,
                created_at=q_log.created_at.isoformat() if q_log.created_at else datetime.now(timezone.utc).isoformat(),
            )
    except Exception:
        pass
    finally:
        db.close()

    # 3. If genuinely not found, return 404
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Audit trace for query_id '{clean_id}' not found in live memory or relational database.",
    )
