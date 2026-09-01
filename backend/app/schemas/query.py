"""Pydantic schemas for /query and /evidence endpoints.
Owner: SRIDINESH (Lead)
"""

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class LocationHint(BaseModel):
    lat: float
    lon: float
    name: Optional[str] = None


class QueryRequest(BaseModel):
    text: str = Field(..., description="User query text or speech transcript")
    conversation_id: Optional[str] = Field(
        default=None, description="Optional conversation session UUID"
    )
    location_hint: Optional[LocationHint] = Field(
        default=None, description="Location context if known"
    )
    role: Optional[
        Literal["fisherman", "researcher", "coast_guard", "policymaker"]
    ] = Field(default="fisherman", description="User persona")
    language: Optional[str] = Field(
        default="en-IN", description="Language code (e.g., en-IN, ta-IN, hi-IN)"
    )


class EvidenceItem(BaseModel):
    claim: str
    source: str
    fetched_at: str
    supporting_value: Optional[Any] = None


class QueryResponse(BaseModel):
    query_id: str
    conversation_id: Optional[str] = None
    intent: str
    recommendation: str
    risk_score: Optional[float] = None
    risk_band: Optional[Literal["low", "moderate", "high", "extreme"]] = None
    evidence: List[EvidenceItem] = Field(default_factory=list)
    confidence: Literal["high", "medium", "low"] = "high"
    caveats: List[str] = Field(default_factory=list)
    map_layers: List[str] = Field(default_factory=list)
    language: str = "en-IN"


class EvidenceDetailResponse(BaseModel):
    query_id: str
    raw_query: str
    plan: Dict[str, Any]
    evidence: List[EvidenceItem]
    created_at: str
