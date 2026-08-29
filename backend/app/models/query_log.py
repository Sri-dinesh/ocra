"""SQLAlchemy Model for Relational Query Logs.
Specification: docs/Backend_Workflow.md §7.3.8
"""

import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base, generate_uuid


class QueryLog(Base):
    __tablename__ = "query_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    raw_query = Column(String, nullable=False)
    detected_language = Column(String, nullable=False, default="en-IN")
    role = Column(String, nullable=False, default="fisherman")  # 'fisherman','researcher','coast_guard','policymaker'
    intent = Column(String, nullable=False)

    location_lat = Column(Float, nullable=True)
    location_lon = Column(Float, nullable=True)
    time_window_start = Column(DateTime(timezone=True), nullable=True)
    time_window_end = Column(DateTime(timezone=True), nullable=True)

    risk_score = Column(Float, nullable=True)
    risk_band = Column(String, nullable=True)  # 'low', 'moderate', 'high', 'extreme'
    sail_clearance = Column(Boolean, nullable=True)
    final_response_text = Column(String, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
        index=True,
    )

    plan_steps = relationship("PlanStep", back_populates="query_log", cascade="all, delete-orphan", order_by="PlanStep.step_order")
    evidence_items = relationship("EvidenceItem", back_populates="query_log", cascade="all, delete-orphan")
