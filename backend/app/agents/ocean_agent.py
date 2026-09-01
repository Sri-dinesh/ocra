"""Ocean Analytics & Productivity Agent (SIH26176).
Specialized agent analyzing physical & biological oceanography, thermal fronts, PFZ suitability, and anomalies.
Owner: SRIDINESH (Lead)
"""

from typing import Dict, Any, List, Optional
from app.agents.state import OceanTelemetry, OceanAnalyticsTelemetry, LocationContext
from app.core.logging import logger


class OceanAnalyticsAgent:
    """Specialized Agent analyzing SST, Chlorophyll-a, Upwelling, and PFZ hotspots."""

    name: str = "OceanAnalyticsAgent"

    @classmethod
    def analyze(
        cls,
        ocean_data: Optional[OceanTelemetry],
        location: Optional[LocationContext] = None,
    ) -> OceanAnalyticsTelemetry:
        """Processes oceanographic telemetry and derives pelagic habitat indicators."""
        logger.info(f"[{cls.name}] Analyzing ocean thermal gradients and biological productivity...")

        if not ocean_data:
            return {
                "agent_name": cls.name,
                "thermal_gradient_c_per_km": 0.0,
                "upwelling_index": 0.5,
                "pfz_suitability_score": 0.5,
                "target_species": ["Indian Mackerel", "Sardines"],
                "is_thermal_front_present": False,
                "productivity_anomaly_detected": False,
                "anomaly_explanation": None,
            }

        sst = ocean_data.get("sst_c", 28.5) or 28.5
        chl = ocean_data.get("chl_a_mgm3", 0.45) or 0.45

        # 1. Thermal Front & Gradient Analysis
        # Ideal pelagic thermal range in Indian waters is 26.5°C to 29.5°C
        is_thermal_front = 26.0 <= sst <= 29.8 and chl >= 0.25
        gradient = 0.45 if is_thermal_front else 0.15

        # 2. Upwelling Index (Elevated Chlorophyll + Favorable Temperature)
        upwelling_idx = min(1.0, max(0.0, (chl / 2.0) * 0.6 + (1.0 - abs(sst - 28.0) / 5.0) * 0.4))

        # 3. PFZ Suitability Score (0.0 to 1.0)
        # MCDA fusion of Chlorophyll-a (40%), SST Favourability (40%), Upwelling (20%)
        chl_score = min(1.0, chl / 1.5)
        sst_score = 1.0 - (abs(sst - 28.2) / 6.0)
        pfz_score = round(max(0.0, min(1.0, 0.45 * chl_score + 0.35 * sst_score + 0.20 * upwelling_idx)), 2)

        # 4. Target Pelagic Species Classification
        species: List[str] = []
        if sst >= 27.5 and chl >= 0.35:
            species.append("Yellowfin Tuna (Thunnus albacares)")
        if chl >= 0.40:
            species.append("Indian Mackerel (Rastrelliger kanagurta)")
            species.append("Oil Sardine (Sardinella longiceps)")
        if sst <= 28.5 and chl >= 0.20:
            species.append("Skipjack Tuna (Katsuwonus pelamis)")

        if not species:
            species = ["Coastal Pelagics", "Carangids (Trevally)"]

        # 5. Ecological Anomaly Detection
        anomaly_detected = False
        anomaly_expl: Optional[str] = None

        if sst > 30.8:
            anomaly_detected = True
            anomaly_expl = f"Marine thermal stress alert: SST at {sst:.1f}°C (>30.8°C threshold) suppresses pelagic schooling."
        elif chl < 0.10:
            anomaly_detected = True
            anomaly_expl = f"Oligotrophic nutrient deficit: Low chlorophyll ({chl:.2f} mg/m³) indicates reduced plankton bloom."
        elif sst < 25.0:
            anomaly_detected = True
            anomaly_expl = f"Intense localized coastal upwelling: Low SST ({sst:.1f}°C) brings nutrient-rich deep water."

        return {
            "agent_name": cls.name,
            "thermal_gradient_c_per_km": gradient,
            "upwelling_index": round(upwelling_idx, 2),
            "pfz_suitability_score": pfz_score,
            "target_species": species,
            "is_thermal_front_present": is_thermal_front,
            "productivity_anomaly_detected": anomaly_detected,
            "anomaly_explanation": anomaly_expl,
        }
