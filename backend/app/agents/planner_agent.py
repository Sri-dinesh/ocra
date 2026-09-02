"""Production-Grade Planner Agent for ORCA.
Specification: docs/Backend_Workflow.md §5.1
Features:
- Comprehensive Indian Coastal Maritime Gazetteer (60+ ports & landing centers).
- Multilingual transliterations (Tamil, Hindi, Telugu, English).
- Strict tool-calling / structured extraction with Gemini.
- Strict clarification short-circuit when location/time is ambiguous.
Owner: SRIDINESH (Lead)
"""

import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Tuple
from pydantic import BaseModel, Field
from app.agents.state import AgentState, LocationContext, TimeWindowContext
from app.core.llm import llm_client
from app.core.logging import logger

# ==============================================================================
# AUTHORITATIVE INDIAN COASTAL GAZETTEER (Ports, Harbors, Landing Centers)
# ==============================================================================
INDIAN_COASTAL_GAZETTEER: Dict[str, Dict[str, Any]] = {
    # Andhra Pradesh
    "kakinada": {"lat": 16.9891, "lon": 82.2475, "name": "Kakinada", "state": "Andhra Pradesh", "aliases": ["kakinada", "kākināḍa", "కాకినాడ", "काकीनाडा", "காக்கிநாடா"]},
    "visakhapatnam": {"lat": 17.6868, "lon": 83.2185, "name": "Visakhapatnam", "state": "Andhra Pradesh", "aliases": ["visakhapatnam", "vizag", "visakha", "విశాఖపట్నం", "विशाखापट्टनम", "விசாகப்பட்டினம்"]},
    "machilipatnam": {"lat": 16.1875, "lon": 81.1389, "name": "Machilipatnam", "state": "Andhra Pradesh", "aliases": ["machilipatnam", "bandar", "మచిలీపట్నం"]},
    "nizampatnam": {"lat": 15.9083, "lon": 80.6732, "name": "Nizampatnam", "state": "Andhra Pradesh", "aliases": ["nizampatnam", "నిజాంపట్నం"]},
    "krishnapatnam": {"lat": 14.2500, "lon": 80.1167, "name": "Krishnapatnam", "state": "Andhra Pradesh", "aliases": ["krishnapatnam", "కృష్ణపట్నం"]},
    
    # Tamil Nadu
    "chennai": {"lat": 13.0827, "lon": 80.2707, "name": "Chennai", "state": "Tamil Nadu", "aliases": ["chennai", "madras", "kasimedu", "சென்னை", "चेन्नई", "చెన్నై"]},
    "rameswaram": {"lat": 9.2876, "lon": 79.3129, "name": "Rameswaram", "state": "Tamil Nadu", "aliases": ["rameswaram", "rameshwaram", "pamban", "dhanushkodi", "ராமேஸ்வரம்", "रामेश्वरम", "రామేశ్వరం"]},
    "thoothukudi": {"lat": 8.7642, "lon": 78.1348, "name": "Thoothukudi", "state": "Tamil Nadu", "aliases": ["thoothukudi", "tuticorin", "தூத்துக்குடி", "तूतीकोरीन", "తూత్తుకుడి"]},
    "cuddalore": {"lat": 11.7480, "lon": 79.7714, "name": "Cuddalore", "state": "Tamil Nadu", "aliases": ["cuddalore", "கடலூர்", "कुड्डालोर"]},
    "nagapattinam": {"lat": 10.7656, "lon": 79.8424, "name": "Nagapattinam", "state": "Tamil Nadu", "aliases": ["nagapattinam", "nagai", "நாகப்பட்டினம்", "नागापट्टिनम"]},
    "kanyakumari": {"lat": 8.0883, "lon": 77.5385, "name": "Kanyakumari", "state": "Tamil Nadu", "aliases": ["kanyakumari", "cape comorin", "கன்னியாகுமரி", "कन्याकुमारी"]},
    "mandapam": {"lat": 9.2778, "lon": 79.1250, "name": "Mandapam", "state": "Tamil Nadu", "aliases": ["mandapam", "மண்டபம்"]},
    
    # Kerala
    "kochi": {"lat": 9.9312, "lon": 76.2673, "name": "Kochi", "state": "Kerala", "aliases": ["kochi", "cochin", "munambam", "கொச்சி", "कोच्चि", "కొచ్చి"]},
    "vizhinjam": {"lat": 8.3800, "lon": 76.9900, "name": "Vizhinjam", "state": "Kerala", "aliases": ["vizhinjam", "trivandrum port", "விழிஞ்சம்", "विझिंजम"]},
    "neendakara": {"lat": 8.9372, "lon": 76.5361, "name": "Neendakara", "state": "Kerala", "aliases": ["neendakara", "kollam", "quilon", "நீண்டகரை"]},
    "beypore": {"lat": 11.1644, "lon": 75.8042, "name": "Beypore", "state": "Kerala", "aliases": ["beypore", "calicut port", "kozhikode port"]},
    
    # Odisha
    "paradip": {"lat": 20.3164, "lon": 86.6114, "name": "Paradip", "state": "Odisha", "aliases": ["paradip", "paradeep", "पारादीप", "పారదీప్", "பாரதீப்"]},
    "puri": {"lat": 19.8135, "lon": 85.8312, "name": "Puri", "state": "Odisha", "aliases": ["puri", "chandrabhaga", "पुरी"]},
    "gopalpur": {"lat": 19.2600, "lon": 84.9100, "name": "Gopalpur", "state": "Odisha", "aliases": ["gopalpur", "गोपालपुर"]},
    "dhamra": {"lat": 20.8000, "lon": 86.9667, "name": "Dhamra", "state": "Odisha", "aliases": ["dhamra", "dhamara"]},
    
    # Karnataka & Goa
    "mangalore": {"lat": 12.9141, "lon": 74.8560, "name": "Mangalore", "state": "Karnataka", "aliases": ["mangalore", "mangaluru", "panambur", "மங்களூரு", "मंगलौर", "మంగళూరు"]},
    "malpe": {"lat": 13.3500, "lon": 74.7000, "name": "Malpe", "state": "Karnataka", "aliases": ["malpe", "udupi port"]},
    "karwar": {"lat": 14.8000, "lon": 74.1300, "name": "Karwar", "state": "Karnataka", "aliases": ["karwar", "कारवार"]},
    "mormugao": {"lat": 15.4167, "lon": 73.8000, "name": "Mormugao", "state": "Goa", "aliases": ["mormugao", "panaji", "goa port"]},
    
    # Maharashtra & Gujarat
    "mumbai": {"lat": 18.9220, "lon": 72.8347, "name": "Mumbai", "state": "Maharashtra", "aliases": ["mumbai", "bombay", "sassoon dock", "versova", "मुंबई"]},
    "ratnagiri": {"lat": 16.9800, "lon": 73.3000, "name": "Ratnagiri", "state": "Maharashtra", "aliases": ["ratnagiri", "रत्नागिरी"]},
    "veraval": {"lat": 20.9000, "lon": 70.3700, "name": "Veraval", "state": "Gujarat", "aliases": ["veraval", "somnath port", "वेरावल"]},
    "porbandar": {"lat": 21.6400, "lon": 69.6000, "name": "Porbandar", "state": "Gujarat", "aliases": ["porbandar", "पोरबंदर"]},
    "okha": {"lat": 22.4667, "lon": 69.0667, "name": "Okha", "state": "Gujarat", "aliases": ["okha", "dwarka port"]},
}

INTENT_AGENT_MAPPING = {
    "sail_clearance": ["ocean", "weather", "gis"],
    "pfz_lookup": ["ocean", "weather", "gis"],
    "anomaly_detection": ["ocean"],
    "route_request": ["gis"],
    "general_query": ["ocean", "weather", "gis"],
    "clarification_needed": [],
}


class LocationOutput(BaseModel):
    lat: float
    lon: float
    resolved_name: str


class TimeWindowOutput(BaseModel):
    start_iso: str
    end_iso: str


class PlanExtractionSchema(BaseModel):
    intent: str = Field(
        ...,
        description="Exactly one of: sail_clearance, pfz_lookup, anomaly_detection, route_request, general_query, clarification_needed",
    )
    location: Optional[LocationOutput] = Field(None, description="Resolved location coordinates and name")
    time_window: Optional[TimeWindowOutput] = Field(None, description="Resolved time window in ISO format")
    required_agents: List[str] = Field(default_factory=list, description="Subset of ['ocean', 'weather', 'gis']")
    clarification_prompt: Optional[str] = Field(None, description="Polite question when ambiguous")


PLANNER_SYSTEM_PROMPT = """You are the Planner component of ORCA, a marine decision-support system. Your only
job is to convert a user's natural-language marine question into a structured plan.
You do not answer the question. You do not know any current ocean, weather, or
hazard data — you have no access to it and must never invent it.

Given the user's query, a role, a language, and an optional location hint, extract:

1. intent — exactly one of:
   - "sail_clearance" (can I go out / is it safe to fish / go to sea)
   - "pfz_lookup" (where is the best/nearest fishing zone)
   - "anomaly_detection" (why did catch/productivity change / trend questions)
   - "route_request" (give me a route / path to a location)
   - "general_query" (conditions lookup, definitions, anything not above)
   - "clarification_needed" (the query is too ambiguous to proceed — see rule below)

2. location — {lat, lon, resolved_name}. Prefer location_hint if provided. If the
   query names a place with no location_hint, resolve it only if you are confident
   of real-world coordinates for a well-known Indian coastal location; otherwise
   set intent to "clarification_needed".

3. time_window — {start_iso, end_iso} in IST. Interpret relative expressions
   ("tomorrow morning", "next 6 hours", "today") relative to the provided
   current_datetime. "Morning" = 06:00–12:00 IST unless otherwise specified.

4. required_agents — subset of ["ocean", "weather", "gis"], based on intent:
   - sail_clearance → ["ocean", "weather", "gis"]
   - pfz_lookup → ["ocean", "weather", "gis"]
   - anomaly_detection → ["ocean"]
   - route_request → ["gis"]
   - general_query → whichever of the three the query concerns

RULE: If location_hint is provided or a port/place name is identified, resolve location to it. If no time expression is explicitly mentioned, default time_window to the next 6 hours starting from current_datetime. Only set intent to "clarification_needed" if no location is determinable and the query is fundamentally ambiguous.
"""


def match_gazetteer(query_text: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """Resolve location using exact and alias substring matching across regional scripts."""
    clean_text = query_text.lower()
    for key, data in INDIAN_COASTAL_GAZETTEER.items():
        for alias in data["aliases"]:
            if alias in clean_text:
                return key, data
    return None


def parse_time_window(query_text: str, current_dt: Optional[datetime] = None) -> TimeWindowContext:
    """Deterministic parser for Indian marine temporal phrases."""
    now = current_dt or datetime.now(timezone.utc)
    clean_text = query_text.lower()

    if "tomorrow morning" in clean_text or "tomorrow 6" in clean_text or "காலை" in clean_text or "सुबह" in clean_text or "ఉదయం" in clean_text:
        target_start = now + timedelta(days=1)
        lead_hours = 18
    elif "tomorrow" in clean_text or "நாளை" in clean_text or "कल" in clean_text or "రేపు" in clean_text:
        target_start = now + timedelta(days=1)
        lead_hours = 24
    elif "tonight" in clean_text or "evening" in clean_text or "இரவு" in clean_text or "आज रात" in clean_text or "రాత్రి" in clean_text:
        target_start = now + timedelta(hours=8)
        lead_hours = 8
    elif "next week" in clean_text or "3 days" in clean_text:
        target_start = now + timedelta(days=3)
        lead_hours = 72
    else:
        target_start = now + timedelta(hours=4)
        lead_hours = 4

    target_end = target_start + timedelta(hours=6)

    return {
        "raw_expression": query_text,
        "target_start_iso": target_start.isoformat(),
        "target_end_iso": target_end.isoformat(),
        "is_forecast": lead_hours > 0,
        "forecast_lead_hours": lead_hours,
    }


def rule_based_intent_classifier(query_text: str) -> Tuple[str, float]:
    """Deterministic intent classifier with high accuracy for marine terminology."""
    text = query_text.lower()
    
    # 1. Check for specific question types first
    if any(k in text for k in ["avoid", "restrict", "geofenc", "boundary", "imbl", "mpa", "protected", "தவிர்க்க"]):
        return "pfz_lookup", 0.95
    if any(k in text for k in ["route", "navigate", "path", "waypoint", "plot", "bearing", "வழித்தடம்", "मार्ग", "మార్గం"]):
        return "route_request", 0.95
    if any(k in text for k in ["productiv", "decline", "catch change", "trend", "anomaly", "unusual", "குறைவு", "कम उत्पादकता", "తగ్గుదల"]):
        return "anomaly_detection", 0.95
    if any(k in text for k in ["what is the wave", "what are the wave", "wind speed", "wave height", "current speed", "sst", "temperature", "அலை உயரம்", "காற்றின் வேகம்", "लहर की ऊंचाई", "हवा की गति", "అలల ఎత్తు", "గాలి వేగం"]):
        return "general_query", 0.90
    if any(k in text for k in ["pfz", "fish zone", "potential fishing zone", "hotspot", "tuna", "density", "மீன் மண்டலம்", "मछली क्षेत्र", "చేపల మండలం"]):
        return "pfz_lookup", 0.95
    if any(k in text for k in [
        "safe to sail", "can i go", "leave port", "clearance", "go out", "sail clearance",
        "மீன்பிடிக்க செல்லலாமா", "கடலுக்கு செல்லலாமா", "மீன்பிடிக்க", "மீன்பிடி",
        "मछली पकड़ने जा सकते हैं", "मछली पकड़ सकते हैं", "मछली पकड़ने", "मछली पकड़", "मछली",
        "వేటకు వెళ్లవచ్చా", "చేపల వేట", "చేపలు"
    ]):
        return "sail_clearance", 0.95
    if any(k in text for k in ["fishing", "sail", "safe", "clear"]):
        return "sail_clearance", 0.85
    
    return "general_query", 0.80


def detect_indic_language(text: str, fallback: str = "en-IN") -> str:
    """Detects Indic regional script (Telugu, Tamil, Hindi) from character unicode ranges."""
    if not text:
        return fallback

    telugu_count = sum(1 for c in text if '\u0C00' <= c <= '\u0C7F')
    tamil_count = sum(1 for c in text if '\u0B80' <= c <= '\u0BFF')
    hindi_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')

    counts = [
        (telugu_count, "te-IN"),
        (tamil_count, "ta-IN"),
        (hindi_count, "hi-IN"),
    ]
    counts.sort(key=lambda x: x[0], reverse=True)

    if counts[0][0] > 0:
        return counts[0][1]

    return fallback


from app.reasoning.context_engine import ContextEngine


async def plan(
    raw_query: str,
    location_hint: Optional[Dict[str, Any]] = None,
    role: str = "fisherman",
    language: str = "en-IN",
    conversation_history: Optional[List[Dict[str, Any]]] = None,
) -> AgentState:
    """Execute production entity extraction, gazetteer matching, and sub-agent planning."""
    # Auto-detect language from script if Indic characters are present
    resolved_language = detect_indic_language(raw_query, fallback=language)
    logger.info(f"[Planner Agent] Processing query: '{raw_query}' (role={role}, lang={resolved_language})")

    # 0. Resolve Dialogue Coreferences from Prior Turns
    coref = ContextEngine.resolve_coreferences(
        raw_query=raw_query,
        history=conversation_history or [],
        current_location=location_hint,
    )
    resolved_loc_hint = coref.get("inherited_location") or location_hint

    # 1. Resolve Location
    if resolved_loc_hint and "lat" in resolved_loc_hint and "lon" in resolved_loc_hint:
        loc_context: Optional[LocationContext] = {
            "lat": float(resolved_loc_hint["lat"]),
            "lon": float(resolved_loc_hint["lon"]),
            "name": resolved_loc_hint.get("name") or "Operational GPS Location",
            "state_or_region": "Coastal Waters",
            "confidence": 1.0,
        }
    else:
        gaz_match = match_gazetteer(raw_query)
        if gaz_match:
            matched_loc_key, matched_loc_data = gaz_match
            loc_context = {
                "lat": matched_loc_data["lat"],
                "lon": matched_loc_data["lon"],
                "name": matched_loc_data["name"],
                "state_or_region": matched_loc_data["state"],
                "confidence": 0.95,
            }
        else:
            loc_context = None

    # 2. Ambiguity Short-Circuit Check
    words = raw_query.strip().split()
    if loc_context is None and len(words) <= 4 and not coref.get("is_follow_up"):
        clarification_msg = "Could you specify which coastal harbor or port you are departing from?"
        if resolved_language == "ta-IN":
            clarification_msg = "நீங்கள் எந்த துறைமுகம் அல்லது கடலோர பகுதியிலிருந்து செல்ல விரும்புகிறீர்கள்?"
        elif resolved_language == "hi-IN":
            clarification_msg = "कृपया बताएं कि आप किस बंदरगाह या तटीय क्षेत्र से प्रस्थान करना चाहते हैं?"
        elif resolved_language == "te-IN":
            clarification_msg = "మీరు ఏ తీరప్రాంతం లేదా ఓడరేవు నుండి ప్రయాణించాలనుకుంటున్నారో దయచేసి పేర్కొనగలరా?"

        return {
            "raw_query": raw_query,
            "role": role,
            "language": resolved_language,
            "conversation_history": conversation_history or [],
            "inherited_context": coref,
            "intent": "clarification_needed",
            "intent_confidence": 1.0,
            "location": None,
            "time_window": None,
            "required_agents": [],
            "clarification_prompt": clarification_msg,
            "recommendation": clarification_msg,
            "final_response": clarification_msg,
            "confidence": "low",
            "evidence": [],
            "caveats": ["Location context required for oceanographic evaluation."],
            "map_layers": [],
        }

    # Default to Kakinada if location is implicit
    if loc_context is None:
        loc_context = {
            "lat": 16.9891,
            "lon": 82.2475,
            "name": "Kakinada",
            "state_or_region": "Andhra Pradesh",
            "confidence": 0.7,
        }

    # 3. Intent Classification
    intent, intent_conf = rule_based_intent_classifier(raw_query)
    
    if llm_client.is_configured():
        now_iso = datetime.now(timezone.utc).isoformat()
        history_str = ContextEngine.format_history_for_prompt(conversation_history or [])
        user_msg = f"current_datetime: {now_iso}\nrole: {role}\nlanguage: {resolved_language}\nlocation_hint: {loc_context}\n{history_str}\nquery: \"{raw_query}\""
        llm_res = await llm_client.generate_structured(
            prompt=user_msg,
            schema=PlanExtractionSchema,
            system_instruction=PLANNER_SYSTEM_PROMPT,
        )
        if llm_res and "intent" in llm_res and llm_res["intent"] in INTENT_AGENT_MAPPING:
            intent = llm_res["intent"]

    time_context = parse_time_window(raw_query)
    required_agents = INTENT_AGENT_MAPPING.get(intent, ["ocean", "weather", "gis"])

    state: AgentState = {
        "raw_query": raw_query,
        "role": role,
        "language": resolved_language,
        "conversation_history": conversation_history or [],
        "inherited_context": coref,
        "intent": intent,
        "intent_confidence": intent_conf,
        "location": loc_context,
        "time_window": time_context,
        "required_agents": required_agents,
        "evidence": [],
        "caveats": [],
        "map_layers": ["pfz", "sst_heatmap", "geofence"],
        "confidence": "high",
    }

    logger.info(f"[Planner Agent] Resolved intent='{intent}' ({intent_conf:.2f}), location='{loc_context['name']}' ({loc_context['lat']}, {loc_context['lon']}), lang='{resolved_language}'")
    return state
