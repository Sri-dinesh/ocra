from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
import datetime
from app.db.session import Base

class QueryLog(Base):
    __tablename__ = "query_logs"

    # Maps to query_id from the response
    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    raw_query = Column(String, nullable=False)
    detected_language = Column(String, nullable=True)
    intent = Column(String, nullable=True)
    plan_json = Column(JSON, nullable=True)
    evidence_json = Column(JSON, nullable=True)
    role = Column(String, nullable=True) # 'fisherman'/'researcher'/'coast_guard'/'policymaker'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
