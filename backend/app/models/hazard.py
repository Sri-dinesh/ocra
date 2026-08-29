from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from app.db.session import Base, generate_uuid

class Hazard(Base):
    __tablename__ = "hazards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    hazard_type = Column(String, nullable=False) # 'cyclone' / 'high_wave' / 'lightning'
    severity = Column(String, nullable=False) # 'low'/'moderate'/'high'/'critical'
    geom = Column(Geometry('POLYGON', srid=4326, spatial_index=True), nullable=True)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    source = Column(String, nullable=True)
    raw_bulletin_ref = Column(String, nullable=True)
