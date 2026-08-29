"""SQLAlchemy Model for Marine Hazards and Bulletins.
Specification: docs/Backend_Workflow.md §7.3.4
"""

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

try:
    from geoalchemy2 import Geometry
except ImportError:
    class Geometry(String):
        def __init__(self, *args, **kwargs):
            super().__init__()

from app.db.session import Base, generate_uuid


class Hazard(Base):
    __tablename__ = "hazards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    hazard_type = Column(String, nullable=False)  # 'cyclone', 'high_wave', 'lightning'
    severity = Column(String, nullable=False)  # 'low', 'moderate', 'high', 'critical'
    geom = Column(Geometry("POLYGON", srid=4326, spatial_index=True), nullable=True)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True, index=True)
    raw_bulletin_ref = Column(String, nullable=True)

    source = relationship("Source", foreign_keys=[source_id])
