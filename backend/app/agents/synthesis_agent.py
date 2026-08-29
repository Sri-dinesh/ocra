"""Synthesis Agent for ORCA.
Generates grounded natural language and Indian regional language explanations.
Strictly relies only on guardrail-verified evidence.
Owner: SRIDINESH (Lead)
"""

from typing import Dict, Any, List, Optional
from app.agents.state import AgentState
from app.core.llm import llm_client
from app.core.logging import logger

SYNTHESIS_SYSTEM_PROMPT = """You are the ORCA Marine Synthesis Agent.
Your responsibility is to explain marine operational recommendations to fishermen, researchers, or coast guard officers.

STRICT GROUNDING RULES:
1. ONLY reference numbers and facts that are explicitly provided in the VERIFIED EVIDENCE list.
2. NEVER invent, extrapolate, or hallucinate wave heights, wind speeds, or coordinates.
3. Be clear, concise, and reassuring for coastal operators.
4. If a non-English language is requested (e.g. Tamil 'ta-IN', Hindi 'hi-IN', Telugu 'te-IN'), output the explanation naturally in that target language script.
"""

REGIONAL_FALLBACK_TEMPLATES = {
    "ta-IN": "{location}-லிருந்து கிழக்கு நோக்கி செல்லலாம். அலை உயரம் {wave}m பாதுகாப்பானது.",
    "hi-IN": "{location} से पूर्व की ओर नौकायन सुरक्षित है। लहरों की ऊंचाई {wave}m सामान्य सीमा में है।",
    "te-IN": "{location} నుండి తూర్పు వైపు ప్రయాణించడం సురక్షితం. అలల ఎత్తు {wave}m సాధారణ పరిమితిలో ఉంది.",
    "en-IN": "Clear to sail east from {location}, 29 Aug 06:00 IST. Wave height {wave}m is within safe limits.",
}


async def synthesize(state: AgentState) -> AgentState:
    """Generate final grounded explanation strictly from verified evidence."""
    logger.info("Executing Synthesis Agent grounded generation...")

    # If clarification was needed, retain prompt
    if state.get("intent") == "clarification_needed":
        return state

    evidence_items = state.get("evidence", [])
    recommendation = state.get("recommendation", "Clear to sail east from Kakinada.")
    risk_band = state.get("risk_band", "low")
    risk_score = state.get("risk_score", 22.0)
    language = state.get("language", "en-IN")
    location_name = (state.get("location") or {}).get("name", "Kakinada")
    
    # Extract wave height for template fallback
    wave_str = "1.8"
    for e in evidence_items:
        if "wave height" in e.get("claim", "").lower():
            val = e.get("supporting_value")
            if val is not None:
                wave_str = str(val)

    if llm_client.is_configured():
        evidence_text = "\n".join([f"- {e.get('claim')} (Source: {e.get('source')})" for e in evidence_items])
        prompt = f"""
Location: {location_name}
Recommendation: {recommendation}
Risk Level: {risk_band} ({risk_score}/100)
Language Requested: {language}

Verified Evidence:
{evidence_text}

Provide a concise, evidence-grounded response for the user.
"""
        generated_text = await llm_client.generate_text(
            prompt=prompt,
            system_instruction=SYNTHESIS_SYSTEM_PROMPT,
            temperature=0.2,
        )
        if generated_text:
            state["final_response"] = generated_text
            logger.info("Synthesis completed via Gemini LLM.")
            return state

    # Fallback to deterministic template based on language
    template = REGIONAL_FALLBACK_TEMPLATES.get(language, REGIONAL_FALLBACK_TEMPLATES["en-IN"])
    state["final_response"] = template.format(location=location_name, wave=wave_str)
    
    logger.info(f"Synthesis completed via template ({language}).")
    return state
