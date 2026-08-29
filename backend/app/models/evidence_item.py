"""SQLAlchemy Model for Relational Evidence Audit Items.
Specification: docs/Backend_Workflow.md §7.3.10
"""

from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base, generate_uuid


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    query_log_id = Column(UUID(as_uuid=True), ForeignKey("query_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    claim_text = Column(String, nullable=False)
    supporting_value = Column(Float, nullable=True)

    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True, index=True)
    ocean_state_id = Column(UUID(as_uuid=True), ForeignKey("ocean_states.id", ondelete="SET NULL"), nullable=True)
    hazard_id = Column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="SET NULL"), nullable=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)

    quality = Column(String, nullable=False)  # 'good', 'stale', 'partial', 'missing'
    fetched_at = Column(DateTime(timezone=True), nullable=True)

    query_log = relationship("QueryLog", back_populates="evidence_items")
    source = relationship("Source", foreign_keys=[source_id])
    ocean_state = relationship("OceanState", foreign_keys=[ocean_state_id])
    hazard = relationship("Hazard", foreign_keys=[hazard_id])
    zone = relationship("Zone", foreign_keys=[zone_id])
