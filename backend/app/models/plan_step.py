"""SQLAlchemy Model for Agent Plan Steps Execution Trace.
Specification: docs/Backend_Workflow.md §7.3.9
"""

from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base, generate_uuid


class PlanStep(Base):
    __tablename__ = "plan_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    query_log_id = Column(UUID(as_uuid=True), ForeignKey("query_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name = Column(String, nullable=False)  # 'planner', 'ocean', 'weather', 'gis', 'guardrail', 'risk', 'synthesis'
    step_order = Column(Integer, nullable=False)
    status = Column(String, nullable=False)  # 'success', 'skipped', 'failed'
    duration_ms = Column(Integer, nullable=True)

    query_log = relationship("QueryLog", back_populates="plan_steps")
