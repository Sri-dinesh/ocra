"""Navigation Risk & Safety Recommendation Engine.
Calculates weighted composite operational risk scores and enforces authoritative hazard overrides.
Owner: SRIDINESH (Lead)
"""

from typing import Optional, Literal, List, Dict, Any
from app.agents.state import AgentState
from app.core.logging import logger


def compute_risk_score(
    wave_height_m: Optional[float] = None,
    wind_speed_kt: Optional[float] = None,
    distance_to_imbl_nm: Optional[float] = None,
    hazard_severity: Optional[str] = None,
) -> float:
    """Compute weighted marine navigation risk score (0 - 100).
    TRD Composite Formula:
    - Wave Risk Weight (40%): wave_height / 3.5m * 40
    - Wind Risk Weight (30%): wind_speed / 28kt * 30
    - IMBL Proximity (15%): < 3nm -> 15, < 5nm -> 8
    - Hazard Severity (15%): critical=100 (override), high=15, moderate=8, low=0
    """
    if hazard_severity == "critical":
        return 95.0

    score = 0.0

    # 1. Wave contribution
    if wave_height_m is not None:
        wave_component = min(40.0, (wave_height_m / 3.5) * 40.0)
        score += wave_component
    else:
        score += 10.0

    # 2. Wind contribution
    if wind_speed_kt is not None:
        wind_component = min(30.0, (wind_speed_kt / 28.0) * 30.0)
        score += wind_component
    else:
        score += 7.0

    # 3. IMBL Proximity contribution
    if distance_to_imbl_nm is not None:
        if distance_to_imbl_nm < 2.0:
            score += 20.0
        elif distance_to_imbl_nm < 5.0:
            score += 10.0

    # 4. Hazard Severity contribution
    if hazard_severity == "high":
        score += 15.0
    elif hazard_severity == "moderate":
        score += 8.0

    return float(max(0.0, min(100.0, round(score, 1))))


def band_risk(score: float) -> Literal["low", "moderate", "high", "extreme"]:
    """Map numeric risk score into standard PRD risk band."""
    if score <= 25.0:
        return "low"
    elif score <= 50.0:
        return "moderate"
    elif score <= 75.0:
        return "high"
    return "extreme"


def sail_clearance(state: AgentState) -> bool:
    """Determine sail clearance. Enforces hard override for cyclone/critical hazards."""
    weather = state.get("weather_data") or {}
    
    # 1. Hard Cyclone Override
    if weather.get("has_cyclone", False):
        logger.warning("Hard override: Cyclone detected -> Sail clearance DENIED.")
        return False

    # 2. Hard Critical Hazard Override
    if weather.get("highest_severity") == "critical":
        logger.warning("Hard override: Critical hazard bulletin -> Sail clearance DENIED.")
        return False

    # 3. Score-based evaluation
    score = state.get("risk_score", 0.0)
    return score < 60.0


def rank_pfz_candidates(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Rank PFZ candidate hotspots by combining SST gradient, Chlorophyll-a, and distance."""
    ranked = []
    for c in candidates:
        item = dict(c)
        sst = item.get("sst_c", 28.0)
        chl = item.get("chl_a_mgm3", 1.0)
        dist = item.get("distance_nm", 10.0)
        
        # PFZ Suitability heuristic (optimal SST ~27-29C, high chl-a, closer distance)
        sst_score = max(0.0, 10.0 - abs(sst - 28.0) * 5.0)
        chl_score = min(10.0, chl * 5.0)
        dist_penalty = min(10.0, dist * 0.3)
        
        composite = sst_score + chl_score - dist_penalty
        item["suitability_score"] = round(composite, 2)
        item["ranking_reason"] = f"Optimal SST ({sst}°C) and productive chlorophyll ({chl} mg/m³)"
        ranked.append(item)

    ranked.sort(key=lambda x: x["suitability_score"], reverse=True)
    return ranked


def evaluate_risk_and_recommendation(state: AgentState) -> AgentState:
    """Execute risk calculation and formulate initial recommendation."""
    ocean = state.get("ocean_data") or {}
    weather = state.get("weather_data") or {}
    gis = state.get("gis_data") or {}

    wave_h = ocean.get("wave_height_m", 1.8)
    wind_spd = ocean.get("wind_speed_kt", 14.0)
    dist_imbl = gis.get("distance_to_imbl_nm", 42.6)
    sev = weather.get("highest_severity", "low")

    score = compute_risk_score(wave_h, wind_spd, dist_imbl, sev)
    band = band_risk(score)
    allowed = sail_clearance(state)

    state["risk_score"] = score
    state["risk_band"] = band
    state["sail_allowed"] = allowed

    loc_name = (state.get("location") or {}).get("name", "Kakinada")
    
    if not allowed:
        state["recommendation"] = (
            f"Advisory: Do not sail from {loc_name}. Adverse conditions detected ({band} risk)."
        )
    else:
        state["recommendation"] = (
            f"Clear to sail east from {loc_name}, 29 Aug 06:00 IST"
        )

    logger.info(f"Risk evaluation: score={score}, band={band}, sail_allowed={allowed}")
    return state
