"""SQLAlchemy Model for Vessel Registry.
Specification: docs/Backend_Workflow.md §7.3.5
"""

import datetime
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base, generate_uuid


class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    label = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    subscriptions = relationship("WatchdogSubscription", back_populates="vessel", cascade="all, delete-orphan")
    alerts = relationship("WatchdogAlert", back_populates="vessel", cascade="all, delete-orphan")
