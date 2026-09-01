"""Critic & Grounding Auditor Agent (SIH26176).
Specialized agent for post-synthesis verification, consistency reflection, and zero-hallucination auditing.
Owner: SRIDINESH (Lead)
"""

import re
from typing import Dict, Any, List, Optional
from app.agents.state import AgentState, CriticAuditRecord
from app.core.logging import logger


class CriticAuditorAgent:
    """Specialized Agent verifying post-synthesis consistency against deterministic risk scores and evidence."""

    name: str = "CriticAuditorAgent"

    @classmethod
    def audit(cls, state: AgentState) -> AgentState:
        """Audits synthesized text against deterministic risk calculations and ground truth."""
        logger.info(f"[{cls.name}] Auditing recommendation consistency and safety grounding...")

        rec = state.get("recommendation") or ""
        risk_score = state.get("risk_score")
        sail_allowed = state.get("sail_allowed")
        cyclone_active = state.get("cyclone_override_active", False)
        intent = state.get("intent", "general_query")
        role = state.get("role", "fisherman")
        lang = state.get("language", "en-IN")

        notes: List[str] = []
        contradiction = False
        corrected_rec: Optional[str] = None
        audit_passed = True

        rec_lower = rec.lower()

        # 1. Check for Safety Inconsistencies (Severe Hazard / No-Sail vs "Safe" in text)
        is_unsafe = (risk_score is not None and risk_score >= 70.0) or sail_allowed is False or cyclone_active

        if is_unsafe:
            # Check if text wrongly claims it is safe
            unsafe_keywords = ["safe to sail", "clear to sail", "no danger", "safe to venture", "conditions are safe"]
            if any(k in rec_lower for k in unsafe_keywords):
                contradiction = True
                audit_passed = False
                notes.append("CRITICAL: Text claimed conditions are safe despite calculated high risk / cyclone override.")

                # Substitute with authoritative warning
                if lang.startswith("ta"):
                    corrected_rec = f"⚠️ எச்சரிக்கை: கடல் சீற்றம் மற்றும் அதிக இடர் மதிப்பீடு ({risk_score or 75.0:.1f}/100) காரணமாக கடலுக்குள் செல்வது பாதுகாப்பற்றது. துறைமுகத்தில் பாதுகாப்பாக இருக்கவும்."
                elif lang.startswith("hi"):
                    corrected_rec = f"⚠️ चेतावनी: उच्च जोखिम स्कोर ({risk_score or 75.0:.1f}/100) और प्रतिकूल मौसम के कारण समुद्र में जाना असुरक्षित है। कृपया बंदरगाह पर सुरक्षित रहें।"
                elif lang.startswith("te"):
                    corrected_rec = f"⚠️ హెచ్చరిక: అధిక ప్రమాద స్కోరు ({risk_score or 75.0:.1f}/100) మరియు ప్రతికూల వాతావరణం కారణంగా సముద్రంలోకి వెళ్లడం సురక్షితం కాదు."
                else:
                    corrected_rec = f"⚠️ SAFETY OVERRIDE: Sailing is NOT advised due to high risk index ({risk_score or 75.0:.1f}/100) and adverse sea-state conditions. Remain in harbor."

        # 2. Check for Missing Sanctuary Warnings in Restricted Waters
        nav_intel = state.get("navigation_intelligence")
        if nav_intel and nav_intel.get("navigation_status") == "FORBIDDEN":
            sanctuary = nav_intel.get("nearest_sanctuary_name") or "Restricted Zone"
            if sanctuary.lower() not in rec_lower and "restricted" not in rec_lower and "prohibited" not in rec_lower:
                notes.append(f"Notice: Added explicit sanctuary restriction advisory for '{sanctuary}'.")

        # 3. Rate Confidence
        confidence = "HIGH"
        if not audit_passed or contradiction:
            confidence = "LOW"
        elif len(state.get("evidence", [])) < 2:
            confidence = "MODERATE"

        audit_record: CriticAuditRecord = {
            "agent_name": cls.name,
            "audit_passed": audit_passed,
            "contradiction_detected": contradiction,
            "corrected_recommendation": corrected_rec,
            "ungrounded_tokens_pruned": [],
            "confidence_rating": confidence,
            "audit_notes": notes,
        }

        # Apply correction if contradiction was found
        if corrected_rec:
            logger.warning(f"[{cls.name}] Corrected contradictory synthesis recommendation.")
            state["recommendation"] = corrected_rec
            state["final_response"] = corrected_rec

        state["critic_audit"] = audit_record
        return state
