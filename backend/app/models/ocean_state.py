from sqlalchemy import Column, String, Float, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
try:
    from geoalchemy2 import Geometry
except ImportError:
    class Geometry(String):
        def __init__(self, *args, **kwargs):
            super().__init__()
import datetime
from app.db.session import Base, generate_uuid

class OceanState(Base):
    __tablename__ = "ocean_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    geom = Column(Geometry('POINT', srid=4326, spatial_index=True), nullable=False)
    valid_time = Column(DateTime(timezone=True), nullable=False)
    fetched_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    
    sst_c = Column(Float, nullable=True)
    chl_a_mgm3 = Column(Float, nullable=True)
    wave_height_m = Column(Float, nullable=True)
    wind_speed_kt = Column(Float, nullable=True)
    current_speed_ms = Column(Float, nullable=True)
    current_dir_deg = Column(Float, nullable=True)
    
    source_map = Column(JSON, nullable=False, default={})
    quality = Column(String, nullable=False) # 'good' / 'stale' / 'partial'
