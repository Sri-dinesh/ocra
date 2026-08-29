"""SQLAlchemy Model for Canonical Sources Vocabulary.
Specification: docs/Backend_Workflow.md §7.3.1
"""

from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base, generate_uuid


class Source(Base):
    __tablename__ = "sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    code = Column(String, unique=True, nullable=False, index=True)  # e.g., 'incois_osf', 'copernicus_cmems'
    display_name = Column(String, nullable=False)
    provider_org = Column(String, nullable=True)
    access_method = Column(String, nullable=True)  # 'api', 'wms', 'bulk_download', 'mock'
    is_mock = Column(Boolean, default=False, nullable=False)
