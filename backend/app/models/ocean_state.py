"""SQLAlchemy Model for Ocean Environmental States with per-field Source FKs.
Specification: docs/Backend_Workflow.md §7.3.2
"""

import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

try:
    from geoalchemy2 import Geometry
except ImportError:
    class Geometry(String):
        def __init__(self, *args, **kwargs):
            super().__init__()

from app.db.session import Base, generate_uuid


class OceanState(Base):
    __tablename__ = "ocean_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    geom = Column(Geometry("POINT", srid=4326, spatial_index=True), nullable=False)
    valid_time = Column(DateTime(timezone=True), nullable=False)
    fetched_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    sst_c = Column(Float, nullable=True)
    sst_source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True, index=True)

    chl_a_mgm3 = Column(Float, nullable=True)
    chl_source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True, index=True)

    wave_height_m = Column(Float, nullable=True)
    wave_source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True, index=True)

    wind_speed_kt = Column(Float, nullable=True)
    wind_source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True, index=True)

    current_speed_ms = Column(Float, nullable=True)
    current_dir_deg = Column(Float, nullable=True)
    current_source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True, index=True)

    quality = Column(String, nullable=False)  # 'good', 'stale', 'partial'

    # Relationships
    sst_source = relationship("Source", foreign_keys=[sst_source_id])
    chl_source = relationship("Source", foreign_keys=[chl_source_id])
    wave_source = relationship("Source", foreign_keys=[wave_source_id])
    wind_source = relationship("Source", foreign_keys=[wind_source_id])
    current_source = relationship("Source", foreign_keys=[current_source_id])
