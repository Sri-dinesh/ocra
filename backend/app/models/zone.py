from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
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
    name = Column(String, nullable=False)
    zone_type = Column(String, nullable=False) # 'imbl' / 'mpa' / 'restricted' / 'pfz'
    geom = Column(Geometry('POLYGON', srid=4326, spatial_index=True), nullable=False)
    source = Column(String, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
