"""SQLAlchemy Model for Durable Watchdog Alerts History.
Specification: docs/Backend_Workflow.md §7.3.7
"""

import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base, generate_uuid


class WatchdogAlert(Base):
    __tablename__ = "watchdog_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    vessel_id = Column(UUID(as_uuid=True), ForeignKey("vessels.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String, nullable=False)  # 'HIGH_WAVE', 'IMBL_PROXIMITY', 'CYCLONE'
    severity = Column(String, nullable=False)  # 'low', 'moderate', 'high', 'critical'
    message = Column(String, nullable=False)
    triggered_hazard_id = Column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="SET NULL"), nullable=True)
    triggered_zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)
    triggered_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
        index=True,
    )
    acknowledged = Column(Boolean, default=False, nullable=False)

    vessel = relationship("Vessel", back_populates="alerts")
    triggered_hazard = relationship("Hazard", foreign_keys=[triggered_hazard_id])
    triggered_zone = relationship("Zone", foreign_keys=[triggered_zone_id])
