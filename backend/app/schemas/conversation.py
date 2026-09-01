"""Pydantic schemas for Conversation History endpoints.
Specification: docs/Backend_Workflow.md §7.3.8 & §6
Owner: SRIDINESH (Lead)
"""

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.query import QueryResponse, LocationHint, EvidenceItem


class ConversationSummary(BaseModel):
    id: str
    title: str
    role: str
    language: str
    created_at: str
    updated_at: str
    message_count: int
    last_query_preview: Optional[str] = None
    last_risk_band: Optional[str] = None
    last_risk_score: Optional[float] = None


class ConversationMessage(BaseModel):
    id: str
    role: Literal["user", "orca"]
    text: str
    timestamp: str
    responsePayload: Optional[QueryResponse] = None
    locationHint: Optional[LocationHint] = None
    kind: Optional[str] = "normal"


class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    role: str
    language: str
    created_at: str
    updated_at: str
    messages: List[ConversationMessage] = Field(default_factory=list)


class CreateConversationRequest(BaseModel):
    title: Optional[str] = None
    role: Optional[str] = "fisherman"
    language: Optional[str] = "en-IN"


class UpdateConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
