"""SQLAlchemy Model for Marine Zones and Boundaries.
Specification: docs/Backend_Workflow.md §7.3.3
"""

from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

try:
    from geoalchemy2 import Geometry
except ImportError:
    class Geometry(String):
        def __init__(self, *args, **kwargs):
            super().__init__()

from app.db.session import Base, generate_uuid


class Zone(Base):
    __tablename__ = "zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False, index=True)
    zone_type = Column(String, nullable=False)  # 'imbl', 'mpa', 'restricted', 'pfz'
    geom = Column(Geometry("POLYGON", srid=4326, spatial_index=True), nullable=False)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True, index=True)
    active = Column(Boolean, default=True, nullable=False)

    source = relationship("Source", foreign_keys=[source_id])
