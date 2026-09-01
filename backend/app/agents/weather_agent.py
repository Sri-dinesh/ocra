"""Weather & Cyclone Intelligence Agent (SIH26176).
Specialized agent for synoptic weather analysis, storm proximity, and meteorological risk evaluation.
Owner: SRIDINESH (Lead)
"""

from typing import Dict, Any, List, Optional
from app.agents.state import WeatherTelemetry, WeatherIntelligenceTelemetry, LocationContext
from app.core.logging import logger


class WeatherIntelligenceAgent:
    """Specialized Agent analyzing meteorological bulletins and atmospheric hazard risks."""

    name: str = "WeatherIntelligenceAgent"

    @classmethod
    def analyze(
        cls,
        weather_data: Optional[WeatherTelemetry],
        location: Optional[LocationContext] = None,
        wind_speed_kt: Optional[float] = None,
    ) -> WeatherIntelligenceTelemetry:
        """Evaluates weather telemetry and derives meteorological hazard indices."""
        logger.info(f"[{cls.name}] Analyzing meteorological parameters and IMD bulletins...")

        if not weather_data:
            return {
                "agent_name": cls.name,
                "synoptic_summary": "Weather observations normal with no severe synoptic alerts.",
                "storm_distance_km": None,
                "is_squall_alert": False,
                "is_cyclone_alert": False,
                "pressure_trend_hpa": 1012.0,
                "weather_risk_index": 10.0,
                "weather_caveats": [],
                "advisory_bulletin": None,
            }

        hazards = weather_data.get("hazards", [])
        has_cyclone = weather_data.get("has_cyclone", False)
        highest_sev = weather_data.get("highest_severity", "low")

        is_squall = any("squall" in h.get("type", "").lower() or "gale" in h.get("type", "").lower() for h in hazards)
        is_lightning = any("lightning" in h.get("type", "").lower() for h in hazards)
        is_high_wave = any("high_wave" in h.get("type", "").lower() for h in hazards)

        # Weather risk calculation
        risk = 10.0
        caveats: List[str] = []

        if has_cyclone or highest_sev == "critical":
            risk = 95.0
            caveats.append("CRITICAL: Active cyclone circulation detected within operational sector.")
        elif highest_sev == "high" or is_squall:
            risk = 70.0
            caveats.append("WARNING: High wind squall / gale advisory in effect.")
        elif highest_sev == "moderate" or is_lightning:
            risk = 45.0
            caveats.append("CAUTION: Moderate convective activity / isolated lightning predicted.")

        if wind_speed_kt and wind_speed_kt > 25.0:
            risk = max(risk, min(90.0, 30.0 + (wind_speed_kt - 25.0) * 3.0))
            caveats.append(f"Gale warning: Sustained surface winds at {wind_speed_kt:.1f} kt.")

        storm_dist: Optional[float] = None
        if has_cyclone:
            storm_dist = 65.0  # Estimated proximity in km
            summary = "Active cyclone warning issued by IMD with severe maritime hazards."
        elif is_squall:
            summary = "Gale wind advisory in effect with gusty squalls."
        else:
            summary = "Atmospheric conditions within standard seasonal operating limits."

        return {
            "agent_name": cls.name,
            "synoptic_summary": summary,
            "storm_distance_km": storm_dist,
            "is_squall_alert": is_squall or (wind_speed_kt is not None and wind_speed_kt > 28.0),
            "is_cyclone_alert": has_cyclone,
            "pressure_trend_hpa": 1008.0 if has_cyclone else 1012.5,
            "weather_risk_index": round(risk, 1),
            "weather_caveats": caveats,
            "advisory_bulletin": weather_data.get("bulletin_text"),
        }
