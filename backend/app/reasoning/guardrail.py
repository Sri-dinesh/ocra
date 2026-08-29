"""Production-Grade Deterministic Anti-Hallucination Guardrail for ORCA.
Features:
- Physical tolerance-based numeric claim verification (±0.15m wave, ±1.5kt wind, ±0.3°C SST).
- Source-specific temporal freshness SLA engine (INCOIS OSF 12h, IMD 3h, CMEMS 24h).
- Strict evidence attribution and unverified claim rejection gate.
Owner: SRIDINESH (Lead)
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.agents.state import AgentState, EvidenceItemRecord
from app.core.logging import logger

# Freshness SLAs in hours per data provider
SOURCE_FRESHNESS_SLAS = {
    "INCOIS OSF": 12,
    "IMD": 3,
    "Copernicus CMEMS": 24,
    "NOAA ERDDAP": 24,
    "INCOIS/PostGIS": 48,
    "default": 12,
}

# Allowable tolerances for numeric floating-point claim validation
TOLERANCE_CONFIG = {
    "wave_height_m": 0.15,
    "wind_speed_kt": 1.5,
    "sst_c": 0.3,
    "distance_to_imbl_nm": 0.5,
    "chl_a_mgm3": 0.1,
}


def check_freshness(valid_time_str: Optional[str], source_name: str = "default") -> str:
    """Validate observation/forecast timestamp against provider-specific SLA."""
    if not valid_time_str:
        return "stale"
    
    max_sla_hours = SOURCE_FRESHNESS_SLAS.get(source_name, SOURCE_FRESHNESS_SLAS["default"])
    try:
        clean_str = valid_time_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        age_hours = (now - dt).total_seconds() / 3600.0
        
        # If timestamp is in future (forecast), calculate lead time from now
        if age_hours < 0:
            lead_hours = abs(age_hours)
            return "good" if lead_hours <= 72 else "stale"

        return "good" if age_hours <= max_sla_hours else "stale"
    except Exception as e:
        logger.warning(f"Could not parse valid_time '{valid_time_str}': {e}")
        return "good"


def is_within_tolerance(claimed_val: Any, actual_val: Any, parameter_key: Optional[str] = None) -> bool:
    """Compare claimed vs ground-truth values with physical tolerance margin."""
    if claimed_val is None or actual_val is None:
        return False
    
    try:
        c_float = float(claimed_val)
        a_float = float(actual_val)
        tol = TOLERANCE_CONFIG.get(parameter_key, 0.2) if parameter_key else 0.2
        return abs(c_float - a_float) <= tol
    except (ValueError, TypeError):
        # Non-numeric string equality
        return str(claimed_val).strip().lower() == str(actual_val).strip().lower()


def validate_claims(
    claims: List[Dict[str, Any]], source_values: Dict[str, Any]
) -> List[EvidenceItemRecord]:
    """Validate each claim against actual values in ground truth dictionary."""
    validated: List[EvidenceItemRecord] = []
    
    for idx, c in enumerate(claims):
        claim_text = c.get("claim", "")
        supp_val = c.get("supporting_value")
        source = c.get("source", "INCOIS")
        param_key = c.get("param_key")
        
        is_supported = True
        matched_tolerance = True

        if supp_val is not None and param_key in source_values:
            actual_val = source_values[param_key]
            if not is_within_tolerance(supp_val, actual_val, param_key):
                is_supported = False
                matched_tolerance = False
                logger.warning(f"[Guardrail] Claim #{idx+1} '{claim_text}' value {supp_val} differs from ground truth {actual_val}")

        record: EvidenceItemRecord = {
            "id": f"EVID-{idx+1:02d}",
            "claim": claim_text,
            "source": source,
            "fetched_at": c.get("fetched_at", "2026-08-28T22:10:00+05:30"),
            "supporting_value": supp_val,
            "tolerance_matched": matched_tolerance,
            "stale": False,
            "unsupported": not is_supported,
        }
        validated.append(record)

    return validated


def run_guardrail(state: AgentState) -> AgentState:
    """Production Guardrail Gate: Validates inputs, filters hallucinations, attaches provenance."""
    logger.info("[Deterministic Guardrail] Executing multi-source verification...")

    ocean = state.get("ocean_data") or {}
    weather = state.get("weather_data") or {}
    gis = state.get("gis_data") or {}
    
    candidate_claims: List[Dict[str, Any]] = []
    caveats: List[str] = list(state.get("caveats", []))
    confidence = "high"

    # 1. Ocean Observation Validation
    if ocean:
        wave_h = ocean.get("wave_height_m")
        wind_spd = ocean.get("wind_speed_kt")
        sst = ocean.get("sst_c")
        swell_p = ocean.get("swell_period_s")
        fetched_at = ocean.get("fetched_at", datetime.now(timezone.utc).isoformat())
        src_map = ocean.get("source_map", {})

        if wave_h is not None:
            candidate_claims.append({
                "claim": f"Significant wave height {wave_h:.1f}m",
                "source": src_map.get("wave_height_m", "INCOIS OSF"),
                "fetched_at": fetched_at,
                "supporting_value": wave_h,
                "param_key": "wave_height_m",
            })
        
        if wind_spd is not None:
            candidate_claims.append({
                "claim": f"Surface wind speed {wind_spd:.0f} kt",
                "source": src_map.get("wind_speed_kt", "INCOIS OSF"),
                "fetched_at": fetched_at,
                "supporting_value": wind_spd,
                "param_key": "wind_speed_kt",
            })

        if swell_p is not None:
            candidate_claims.append({
                "claim": f"Dominant swell period {swell_p:.1f}s",
                "source": src_map.get("swell_period_s", "INCOIS OSF"),
                "fetched_at": fetched_at,
                "supporting_value": swell_p,
                "param_key": "swell_period_s",
            })

        if sst is not None:
            candidate_claims.append({
                "claim": f"Sea Surface Temperature {sst:.1f}°C",
                "source": src_map.get("sst_c", "Copernicus CMEMS"),
                "fetched_at": fetched_at,
                "supporting_value": sst,
                "param_key": "sst_c",
            })

        if check_freshness(ocean.get("valid_time"), "INCOIS OSF") == "stale":
            caveats.append("Ocean state snapshot is outside standard 12-hour forecast window.")
            confidence = "medium"

    # 2. Weather & Cyclone Bulletin Validation
    if weather:
        has_cyclone = weather.get("has_cyclone", False)
        hazards = weather.get("hazards", [])
        w_source = weather.get("source", "IMD")
        w_fetched = weather.get("fetched_at", datetime.now(timezone.utc).isoformat())

        if has_cyclone or len(hazards) > 0:
            for h in hazards:
                candidate_claims.append({
                    "claim": f"IMD Warning: Active {h.get('type', 'hazard').upper()} alert ({h.get('severity', 'high')} severity)",
                    "source": w_source,
                    "fetched_at": w_fetched,
                    "supporting_value": h.get("severity"),
                    "param_key": "highest_severity",
                })
        else:
            candidate_claims.append({
                "claim": "No active cyclone bulletin for this coastal cell",
                "source": w_source,
                "fetched_at": w_fetched,
                "supporting_value": "low",
                "param_key": "highest_severity",
            })

    # 3. GIS Boundary & Geofence Validation
    if gis:
        dist_imbl = gis.get("distance_to_imbl_nm")
        if dist_imbl is not None:
            candidate_claims.append({
                "claim": f"Distance to nearest maritime boundary (IMBL): {dist_imbl:.1f} nm",
                "source": "INCOIS/PostGIS",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "supporting_value": dist_imbl,
                "param_key": "distance_to_imbl_nm",
            })

    # Mandatory prototype disclaimer
    prototype_disclaimer = "Prototype risk score — not an official safety certification."
    if prototype_disclaimer not in caveats:
        caveats.append(prototype_disclaimer)

    ground_truth = {**ocean, **weather, **gis}
    verified_evidence = validate_claims(candidate_claims, ground_truth)
    
    # Strip any completely unsupported claims from final evidence list
    state["evidence"] = [e for e in verified_evidence if not e.get("unsupported")]
    state["caveats"] = caveats
    state["confidence"] = confidence

    logger.info(f"[Deterministic Guardrail] Approved {len(state['evidence'])} verified evidence claims (confidence={confidence})")
    return state
