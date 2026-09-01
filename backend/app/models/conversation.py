"""SQLAlchemy Model for Chat Conversations.
Specification: docs/Backend_Workflow.md §7.3.8 & §6
"""

import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base, generate_uuid


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, index=True)
    title = Column(String, nullable=False, default="New Marine Query")
    role = Column(String, nullable=False, default="fisherman")  # 'fisherman','researcher','coast_guard','policymaker'
    language = Column(String, nullable=False, default="en-IN")

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
        index=True,
    )

    query_logs = relationship(
        "QueryLog",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="QueryLog.created_at.asc()",
    )
