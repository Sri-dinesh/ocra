"""Navigation Risk & Safety Recommendation Engine.
Owner: SRIDINESH (Lead)
"""

from typing import Optional, Literal
from app.core.logging import logger


def compute_risk_score(
    wave_height_m: Optional[float] = None,
    wind_speed_kt: Optional[float] = None,
    distance_to_imbl_nm: Optional[float] = None,
    hazard_severity: Optional[str] = None,
) -> float:
    """Compute weighted marine navigation risk score (0 - 100)."""
    # TODO (SRIDINESH): Implement composite risk formula in Phase 4
    return 22.0


def band_risk(score: float) -> Literal["low", "moderate", "high", "extreme"]:
    """Map numeric risk score into standard risk band."""
    if score <= 25:
        return "low"
    elif score <= 50:
        return "moderate"
    elif score <= 75:
        return "high"
    return "extreme"
