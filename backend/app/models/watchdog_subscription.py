"""SQLAlchemy Model for Watchdog Subscriptions.
Specification: docs/Backend_Workflow.md §7.3.6
"""

import datetime
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base, generate_uuid


class WatchdogSubscription(Base):
    __tablename__ = "watchdog_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    vessel_id = Column(UUID(as_uuid=True), ForeignKey("vessels.id", ondelete="CASCADE"), nullable=False, index=True)
    poll_interval_seconds = Column(Integer, default=30, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    vessel = relationship("Vessel", back_populates="subscriptions")
