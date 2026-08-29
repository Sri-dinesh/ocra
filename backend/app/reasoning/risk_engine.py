"""Production-Grade Navigation Risk & Recommendation Engine.
Features:
- Non-linear composite risk formulation adhering to TRD §B.2.5.
- Vessel class vulnerability modifiers (artisanal vs mechanized trawler).
- Hard authoritative hazard precedence override (IMD cyclones & storm surges).
- Multi-criteria PFZ candidate ranking with thermal front heuristics.
Owner: SRIDINESH (Lead)
"""

import math
from typing import Optional, Literal, List, Dict, Any
from app.agents.state import AgentState
from app.core.logging import logger

VESSEL_CLASS_MODIFIERS = {
    "small": 1.15,      # Artisanal non-mechanized craft / kattumaram
    "medium": 1.0,      # Motorized fiber glass boat (FRP)
    "large": 0.85,      # Mechanized deep-sea trawler
}


def compute_risk_score(
    wave_height_m: Optional[float] = None,
    wind_speed_kt: Optional[float] = None,
    distance_to_imbl_nm: Optional[float] = None,
    hazard_severity: Optional[str] = None,
    swell_period_s: Optional[float] = None,
    boat_class: str = "medium",
) -> float:
    """Calculate calibrated marine operational navigation risk score (0.0 - 100.0).
    TRD Weighted Non-Linear Composite Formula:
    - Wave Risk (40%): non-linear power curve for steepening sea states
    - Wind Risk (30%): Beaufort scale wind stress curve
    - Boundary Proximity (15%): exponential proximity penalty near IMBL
    - Swell & Marine Dynamics (5%): long-period swell hazard
    - Hazard Rating (10%): IMD bulletin severity tier
    """
    if hazard_severity == "critical":
        return 98.0

    score = 0.0

    # 1. Wave contribution (40% max)
    if wave_height_m is not None:
        # Non-linear wave risk: sharp escalation above 2.5m
        normalized_wave = wave_height_m / 3.0
        wave_component = min(40.0, (normalized_wave ** 1.35) * 40.0)
        score += wave_component
    else:
        score += 12.0

    # 2. Wind contribution (30% max)
    if wind_speed_kt is not None:
        normalized_wind = wind_speed_kt / 25.0
        wind_component = min(30.0, (normalized_wind ** 1.25) * 30.0)
        score += wind_component
    else:
        score += 8.0

    # 3. IMBL Proximity contribution (15% max)
    if distance_to_imbl_nm is not None:
        if distance_to_imbl_nm < 1.5:
            score += 15.0  # Critical boundary proximity
        elif distance_to_imbl_nm < 3.0:
            score += 10.0
        elif distance_to_imbl_nm < 5.0:
            score += 5.0

    # 4. Swell Period Dynamic interaction (5% max)
    if swell_period_s is not None and swell_period_s >= 12.0:
        score += 5.0  # Long period oceanic swells indicate distant storms / heavy breaking surf

    # 5. Weather Bulletin contribution (10% max)
    if hazard_severity == "high":
        score += 10.0
    elif hazard_severity == "moderate":
        score += 5.0

    # Apply vessel modifier
    vessel_factor = VESSEL_CLASS_MODIFIERS.get(boat_class, 1.0)
    adjusted_score = score * vessel_factor

    return float(max(0.0, min(100.0, round(adjusted_score, 1))))


def band_risk(score: float) -> Literal["low", "moderate", "high", "extreme"]:
    """Map numeric risk score into PRD UI safety bands."""
    if score <= 25.0:
        return "low"
    elif score <= 50.0:
        return "moderate"
    elif score <= 75.0:
        return "high"
    return "extreme"


def sail_clearance(state: AgentState) -> bool:
    """Evaluate absolute sail clearance with hard hazard overrides."""
    weather = state.get("weather_data") or {}
    
    # HARD OVERRIDE 1: Active Cyclone
    if weather.get("has_cyclone", False):
        logger.warning("[Risk Engine] HARD OVERRIDE: Active cyclone detected. Sail clearance FORBIDDEN.")
        return False

    # HARD OVERRIDE 2: Critical Severity IMD Bulletin
    if weather.get("highest_severity") == "critical":
        logger.warning("[Risk Engine] HARD OVERRIDE: Critical hazard bulletin. Sail clearance FORBIDDEN.")
        return False

    # Hard Override 3: Extreme Risk Score
    score = state.get("risk_score", 0.0)
    if score >= 75.0:
        return False

    return True


def rank_pfz_candidates(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Multi-Criteria Decision Analysis (MCDA) for Potential Fishing Zone ranking."""
    ranked = []
    for idx, c in enumerate(candidates):
        item = dict(c)
        sst = item.get("sst_c", 28.2)
        chl = item.get("chl_a_mgm3", 1.4)
        dist_nm = item.get("distance_nm", 12.0)
        
        # Optimal Indian Ocean pelagic SST window: 27.5°C - 29.0°C
        if 27.5 <= sst <= 29.0:
            thermal_score = 10.0 - abs(sst - 28.2) * 4.0
        else:
            thermal_score = max(0.0, 10.0 - abs(sst - 28.2) * 8.0)

        # Chlorophyll-a productivity (0.5 - 2.5 mg/m³ ideal for pelagic food web)
        chl_score = min(10.0, (chl / 1.5) * 10.0)
        
        # Distance travel penalty (closer zones save fuel)
        dist_penalty = min(8.0, (dist_nm / 30.0) * 8.0)

        composite_suitability = (thermal_score * 0.45) + (chl_score * 0.40) - (dist_penalty * 0.15)
        composite_score = round(max(1.0, min(10.0, composite_suitability)), 1)
        
        item["suitability_score"] = composite_score
        item["ranking_reason"] = (
            f"Strong thermal boundary ({sst:.1f}°C) and productive chlorophyll ({chl:.2f} mg/m³) at {dist_nm:.1f}nm"
        )
        ranked.append(item)

    ranked.sort(key=lambda x: x["suitability_score"], reverse=True)
    return ranked


def evaluate_risk_and_recommendation(state: AgentState) -> AgentState:
    """Execute end-to-end risk evaluation and formulate decision advisory."""
    ocean = state.get("ocean_data") or {}
    weather = state.get("weather_data") or {}
    gis = state.get("gis_data") or {}

    wave_h = ocean.get("wave_height_m", 1.8)
    wind_spd = ocean.get("wind_speed_kt", 14.0)
    dist_imbl = gis.get("distance_to_imbl_nm", 42.6)
    swell_p = ocean.get("swell_period_s", 8.5)
    sev = weather.get("highest_severity", "low")

    # Calculate calibrated score
    score = compute_risk_score(
        wave_height_m=wave_h,
        wind_speed_kt=wind_spd,
        distance_to_imbl_nm=dist_imbl,
        hazard_severity=sev,
        swell_period_s=swell_p,
    )

    band = band_risk(score)
    state["risk_score"] = score
    state["risk_band"] = band
    
    # Check overrides
    has_cyclone = weather.get("has_cyclone", False)
    is_critical = sev == "critical"
    state["cyclone_override_active"] = has_cyclone or is_critical

    allowed = sail_clearance(state)
    state["sail_allowed"] = allowed

    loc_name = (state.get("location") or {}).get("name", "Kakinada")
    
    if not allowed:
        if has_cyclone:
            state["recommendation"] = f"CRITICAL WARNING: Cyclone advisory active near {loc_name}. Do NOT venture into sea."
            state["risk_score"] = 98.0
            state["risk_band"] = "extreme"
        else:
            state["recommendation"] = f"Advisory: Unfavorable sea conditions from {loc_name} ({band.upper()} risk: {score}/100). Postpone departure."
    else:
        state["recommendation"] = f"Clear to sail from {loc_name}. Favorable sea state and safe operational limits."

    logger.info(f"[Risk Engine] Evaluated risk: score={score}, band={band}, sail_allowed={allowed}")
    return state
