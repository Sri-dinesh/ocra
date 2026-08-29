"""Comprehensive Automated Tests for Relational Schema & Provenance.
Specification: docs/Backend_Workflow.md §7
"""

import uuid
import datetime
import pytest
from app.db.session import SessionLocal
from app.models import (
    Source,
    OceanState,
    Zone,
    Hazard,
    Vessel,
    WatchdogSubscription,
    WatchdogAlert,
    QueryLog,
    PlanStep,
    EvidenceItem,
)


def test_sources_and_ocean_state_relational_fk():
    """Verify OceanState per-field source foreign keys resolve to Source records."""
    db = SessionLocal()
    try:
        incois = db.query(Source).filter(Source.code == "incois_osf").first()
        copernicus = db.query(Source).filter(Source.code == "copernicus_cmems").first()
        assert incois is not None
        assert copernicus is not None

        state = OceanState(
            lat=16.989,
            lon=82.247,
            geom="SRID=4326;POINT(82.247 16.989)",
            valid_time=datetime.datetime.now(datetime.timezone.utc),
            sst_c=28.4,
            sst_source_id=copernicus.id,
            wave_height_m=1.8,
            wave_source_id=incois.id,
            quality="good",
        )
        db.add(state)
        db.commit()
        db.refresh(state)

        assert state.sst_source.code == "copernicus_cmems"
        assert state.wave_source.code == "incois_osf"
    finally:
        db.close()


def test_query_log_relational_children():
    """Verify QueryLog correctly cascades to PlanStep and EvidenceItem child rows."""
    db = SessionLocal()
    try:
        q_id = uuid.uuid4()
        q_log = QueryLog(
            id=q_id,
            raw_query="Can I sail tomorrow near Kakinada?",
            detected_language="en-IN",
            role="fisherman",
            intent="sail_clearance",
            risk_score=24.5,
            risk_band="low",
            sail_clearance=True,
            final_response_text="Clear to sail from Kakinada.",
        )
        db.add(q_log)

        step1 = PlanStep(
            query_log_id=q_id,
            agent_name="planner",
            step_order=1,
            status="success",
            duration_ms=45,
        )
        step2 = PlanStep(
            query_log_id=q_id,
            agent_name="ocean",
            step_order=2,
            status="success",
            duration_ms=120,
        )
        db.add(step1)
        db.add(step2)

        incois = db.query(Source).filter(Source.code == "incois_osf").first()
        ev1 = EvidenceItem(
            query_log_id=q_id,
            claim_text="Significant wave height 1.8m",
            supporting_value=1.8,
            source_id=incois.id if incois else None,
            quality="good",
            fetched_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(ev1)
        db.commit()

        # Query back and verify relational traversal
        queried = db.query(QueryLog).filter(QueryLog.id == q_id).first()
        assert queried is not None
        assert len(queried.plan_steps) == 2
        assert queried.plan_steps[0].agent_name == "planner"
        assert len(queried.evidence_items) == 1
        assert queried.evidence_items[0].supporting_value == 1.8
        if incois:
            assert queried.evidence_items[0].source.code == "incois_osf"
    finally:
        db.close()


def test_vessel_watchdog_subscription_and_alerts():
    """Verify Vessel creates WatchdogSubscription and durable WatchdogAlert rows."""
    db = SessionLocal()
    try:
        v_id = uuid.uuid4()
        vessel = Vessel(
            id=v_id,
            label="Sea Warrior-07",
            lat=16.95,
            lon=82.25,
        )
        db.add(vessel)

        sub = WatchdogSubscription(
            vessel_id=v_id,
            poll_interval_seconds=30,
            active=True,
        )
        db.add(sub)

        alert = WatchdogAlert(
            vessel_id=v_id,
            alert_type="IMBL_PROXIMITY",
            severity="critical",
            message="You are 1.2nm from IMBL.",
        )
        db.add(alert)
        db.commit()

        queried_v = db.query(Vessel).filter(Vessel.id == v_id).first()
        assert queried_v is not None
        assert len(queried_v.subscriptions) == 1
        assert queried_v.subscriptions[0].poll_interval_seconds == 30
        assert len(queried_v.alerts) == 1
        assert queried_v.alerts[0].alert_type == "IMBL_PROXIMITY"
    finally:
        db.close()
