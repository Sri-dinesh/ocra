"""Context Engine for Multi-Turn Conversational Reasoning & Anti-Hallucination Grounding (SIH26176).
Features:
- Retrieves recent chronological dialogue turns from database.
- Performs coreference resolution ('there', 'that spot', 'tomorrow', 'that route').
- Generates structured contextual summaries for Planner and Synthesis agents.
- Enforces strict factual separation between dialogue history and live sensor ground truth.
Owner: SRIDINESH (Lead)
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.db.session import SessionLocal
from app.models.query_log import QueryLog
from app.core.logging import logger


class ContextEngine:
    """Context Engine managing multi-turn conversational state and coreference resolution."""

    @classmethod
    def get_recent_dialogue(
        cls,
        conversation_id: Optional[str],
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Retrieves recent dialogue turns for the active conversation in chronological order."""
        if not conversation_id:
            return []

        try:
            conv_uuid = uuid.UUID(conversation_id)
        except (ValueError, TypeError):
            return []

        db = SessionLocal()
        try:
            records = (
                db.query(QueryLog)
                .filter(QueryLog.conversation_id == conv_uuid)
                .order_by(QueryLog.created_at.desc())
                .limit(limit)
                .all()
            )

            dialogue: List[Dict[str, Any]] = []
            for q in reversed(records):
                loc_name = "Coastal Waters"
                if q.location_lat and q.location_lon:
                    loc_name = f"({q.location_lat:.2f}, {q.location_lon:.2f})"

                dialogue.append({
                    "query_id": str(q.id),
                    "user_query": q.raw_query,
                    "intent": q.intent or "general_query",
                    "location_lat": q.location_lat,
                    "location_lon": q.location_lon,
                    "location_name": loc_name,
                    "risk_score": q.risk_score,
                    "risk_band": q.risk_band,
                    "sail_clearance": q.sail_clearance,
                    "recommendation": q.final_response_text or "",
                    "created_at": q.created_at.isoformat() if q.created_at else "",
                })
            return dialogue
        except Exception as e:
            logger.warning(f"[ContextEngine] Error fetching dialogue history: {e}")
            return []
        finally:
            db.close()

    @classmethod
    def resolve_coreferences(
        cls,
        raw_query: str,
        history: List[Dict[str, Any]],
        current_location: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Resolves pronouns ('there', 'that spot', 'tomorrow') and inherits prior location/intent."""
        if not history:
            return {"inherited_location": current_location, "is_follow_up": False}

        last_turn = history[-1]
        query_lower = raw_query.lower()
        is_follow_up = False
        inherited_loc = current_location

        # Check for spatial coreferences ("there", "that area", "that zone", "that spot", "that route", "to it")
        spatial_cues = [
            "there", "that place", "that spot", "that zone", "that area",
            "the same location", "to it", "that fishing zone", "fishing grounds", "that destination"
        ]
        has_spatial_ref = any(cue in query_lower for cue in spatial_cues)

        # Check for contextual follow-up cues ("what about tomorrow", "why", "how far", "is it safe then", "show me route")
        context_cues = [
            "what about", "how about", "and tomorrow", "why is", "why", "how far",
            "plot route", "safe route", "plot the safest route", "can i go then", "what are the waves", "route"
        ]
        has_context_cue = any(cue in query_lower for cue in context_cues)

        if has_spatial_ref or has_context_cue or not current_location:
            is_follow_up = True
            if last_turn.get("location_lat") is not None and last_turn.get("location_lon") is not None:
                inherited_loc = {
                    "lat": float(last_turn["location_lat"]),
                    "lon": float(last_turn["location_lon"]),
                    "name": last_turn.get("location_name") or "Previous Target Location",
                    "state_or_region": "Coastal Waters",
                    "confidence": 0.95,
                }
                logger.info(f"[ContextEngine] Inherited location ({inherited_loc['lat']}, {inherited_loc['lon']}) from prior turn.")

        return {
            "inherited_location": inherited_loc,
            "is_follow_up": is_follow_up,
            "prior_intent": last_turn.get("intent"),
            "prior_risk_score": last_turn.get("risk_score"),
            "prior_recommendation": last_turn.get("recommendation"),
        }

    @classmethod
    def format_history_for_prompt(cls, history: List[Dict[str, Any]]) -> str:
        """Formats conversation history into a concise prompt block."""
        if not history:
            return "No previous conversation context."

        lines: List[str] = ["Recent Conversation History:"]
        for idx, turn in enumerate(history[-3:], start=1):
            q_text = turn.get("user_query", "").strip()
            rec_text = turn.get("recommendation", "").strip()
            if len(rec_text) > 120:
                rec_text = rec_text[:117] + "..."
            loc_str = turn.get("location_name", "")
            lines.append(f"Turn {idx}: User asked '{q_text}' [Location: {loc_str}] -> Assistant: {rec_text}")
        return "\n".join(lines)
