"""Production-Grade Conversation History Endpoints.
Specification: docs/Backend_Workflow.md §7.3.8 & §6
Owner: SRIDINESH (Lead)
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.query_log import QueryLog
from app.schemas.conversation import (
    ConversationSummary,
    ConversationDetailResponse,
    ConversationMessage,
    CreateConversationRequest,
    UpdateConversationRequest,
)
from app.schemas.query import QueryResponse, EvidenceItem, LocationHint
from app.core.logging import logger

router = APIRouter(tags=["conversations"])


def _format_conversation_summary(conv: Conversation) -> ConversationSummary:
    """Format SQLAlchemy Conversation model into ConversationSummary schema."""
    logs = conv.query_logs or []
    last_log: Optional[QueryLog] = logs[-1] if logs else None

    # Each query log represents 2 messages (1 user prompt + 1 assistant reply)
    message_count = len(logs) * 2

    return ConversationSummary(
        id=str(conv.id),
        title=conv.title,
        role=conv.role,
        language=conv.language,
        created_at=conv.created_at.isoformat() if conv.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=conv.updated_at.isoformat() if conv.updated_at else datetime.now(timezone.utc).isoformat(),
        message_count=message_count,
        last_query_preview=last_log.raw_query if last_log else None,
        last_risk_band=last_log.risk_band if last_log else None,
        last_risk_score=last_log.risk_score if last_log else None,
    )


@router.get(
    "/conversations",
    response_model=List[ConversationSummary],
    status_code=status.HTTP_200_OK,
    summary="List all chat conversations",
)
def list_conversations(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> List[ConversationSummary]:
    """Retrieve all chat conversations ordered by most recent activity."""
    try:
        convs = (
            db.query(Conversation)
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
            .all()
        )
        return [_format_conversation_summary(c) for c in convs]
    except Exception as e:
        logger.error(f"[Conversations API] Error listing conversations: {e}")
        return []


@router.post(
    "/conversations",
    response_model=ConversationSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat conversation session",
)
def create_conversation(
    req: CreateConversationRequest,
    db: Session = Depends(get_db),
) -> ConversationSummary:
    """Explicitly create a new conversation session."""
    try:
        conv = Conversation(
            id=uuid.uuid4(),
            title=req.title or "New Marine Query",
            role=req.role or "fisherman",
            language=req.language or "en-IN",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        logger.info(f"[Conversations API] Created new conversation [{conv.id}]: '{conv.title}'")
        return _format_conversation_summary(conv)
    except Exception as e:
        db.rollback()
        logger.error(f"[Conversations API] Error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize conversation session.",
        )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get conversation message history and evidence",
)
def get_conversation_detail(
    conversation_id: str,
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    """Retrieve complete chronological message history and structured evidence for a conversation."""
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation UUID format.",
        )

    conv = db.query(Conversation).filter(Conversation.id == conv_uuid).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    messages: List[ConversationMessage] = []
    logs = conv.query_logs or []

    for log in logs:
        time_str = log.created_at.isoformat() if log.created_at else datetime.now(timezone.utc).isoformat()
        
        loc_hint: Optional[LocationHint] = None
        if log.location_lat is not None and log.location_lon is not None:
            loc_hint = LocationHint(
                lat=log.location_lat,
                lon=log.location_lon,
                name="Reported Location",
            )

        # 1. User Message Turn
        user_msg = ConversationMessage(
            id=f"{log.id}-user",
            role="user",
            text=log.raw_query,
            timestamp=time_str,
            locationHint=loc_hint,
            kind="normal",
        )
        messages.append(user_msg)

        # 2. Assistant (ORCA) Message Turn
        evidence_list = [
            EvidenceItem(
                claim=e.claim_text,
                source=e.source.display_name if e.source else "INCOIS / CMEMS",
                fetched_at=e.fetched_at.isoformat() if e.fetched_at else time_str,
                supporting_value=e.supporting_value,
            )
            for e in (log.evidence_items or [])
        ]

        query_payload = QueryResponse(
            query_id=str(log.id),
            conversation_id=str(conv.id),
            intent=log.intent or "general_query",
            recommendation=log.final_response_text or "Marine decision evaluated.",
            risk_score=log.risk_score,
            risk_band=log.risk_band,
            evidence=evidence_list,
            confidence="high",
            caveats=[],
            map_layers=["pfz", "sst_heatmap", "geofence"],
            language=log.detected_language or conv.language or "en-IN",
        )

        orca_msg = ConversationMessage(
            id=f"{log.id}-orca",
            role="orca",
            text=log.final_response_text or "Marine decision evaluated.",
            timestamp=time_str,
            responsePayload=query_payload,
            locationHint=loc_hint,
            kind="normal",
        )
        messages.append(orca_msg)

    return ConversationDetailResponse(
        id=str(conv.id),
        title=conv.title,
        role=conv.role,
        language=conv.language,
        created_at=conv.created_at.isoformat() if conv.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=conv.updated_at.isoformat() if conv.updated_at else datetime.now(timezone.utc).isoformat(),
        messages=messages,
    )


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationSummary,
    status_code=status.HTTP_200_OK,
    summary="Update conversation title",
)
def update_conversation(
    conversation_id: str,
    req: UpdateConversationRequest,
    db: Session = Depends(get_db),
) -> ConversationSummary:
    """Update title or metadata for a conversation session."""
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation UUID format.",
        )

    conv = db.query(Conversation).filter(Conversation.id == conv_uuid).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    conv.title = req.title.strip()
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)

    return _format_conversation_summary(conv)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation and all its query logs",
)
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
):
    """Delete a conversation session and all its child records."""
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation UUID format.",
        )

    conv = db.query(Conversation).filter(Conversation.id == conv_uuid).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    db.delete(conv)
    db.commit()
    logger.info(f"[Conversations API] Deleted conversation [{conversation_id}]")
    return None
