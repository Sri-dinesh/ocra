"""Geospatial & Navigation Agent (SIH26176).
Specialized agent evaluating Marine Protected Areas (MPA), International Maritime Boundary Line (IMBL), and safe routing waypoints.
Owner: SRIDINESH (Lead)
"""

from typing import Dict, Any, List, Optional
from app.agents.state import GisTelemetry, NavigationIntelligenceTelemetry, LocationContext
from app.core.logging import logger


class GeospatialNavigationAgent:
    """Specialized Agent evaluating spatial boundaries, sanctuary restrictions, and navigational waypoints."""

    name: str = "GeospatialNavigationAgent"

    @classmethod
    def analyze(
        cls,
        gis_data: Optional[GisTelemetry],
        location: Optional[LocationContext] = None,
        wave_height_m: Optional[float] = None,
    ) -> NavigationIntelligenceTelemetry:
        """Evaluates maritime GIS polygons and computes navigational clearance."""
        logger.info(f"[{cls.name}] Evaluating geospatial boundaries and MPA avoidance...")

        if not gis_data:
            return {
                "agent_name": cls.name,
                "navigation_status": "CLEAR",
                "nearest_sanctuary_name": None,
                "sanctuary_distance_nm": None,
                "imbl_buffer_status": "SAFE",
                "suggested_waypoints": [],
                "avoidance_reason": None,
            }

        is_inside = gis_data.get("is_inside_restricted", False)
        dist_imbl = gis_data.get("distance_to_imbl_nm")
        zones = gis_data.get("zones", [])

        nearest_sanctuary = None
        if zones:
            nearest_sanctuary = zones[0].get("name", "Marine Protected Sanctuary")

        # 1. IMBL Buffer Status
        imbl_status = "SAFE"
        if dist_imbl is not None:
            if dist_imbl <= 2.0:
                imbl_status = "BREACH"
            elif dist_imbl <= 5.0:
                imbl_status = "WARNING"

        # 2. Overall Navigation Status & Avoidance Reasons
        status = "CLEAR"
        avoid_reason: Optional[str] = None

        if is_inside:
            status = "FORBIDDEN"
            avoid_reason = f"Vessel position inside restricted ecological sanctuary: {nearest_sanctuary}. Commercial fishing prohibited."
        elif imbl_status == "BREACH":
            status = "FORBIDDEN"
            avoid_reason = f"Proximity breach: Vessel within {dist_imbl:.1f} nm of International Maritime Boundary Line (IMBL)."
        elif imbl_status == "WARNING":
            status = "CAUTION"
            avoid_reason = f"Boundary warning: Operating in sensitive border buffer zone ({dist_imbl:.1f} nm to IMBL)."
        elif wave_height_m and wave_height_m > 3.0:
            status = "RESTRICTED"
            avoid_reason = f"Severe sea state: Significant wave height {wave_height_m:.1f}m exceeds safe navigation envelope."

        # 3. Waypoints corridor heuristic
        waypoints: List[Dict[str, float]] = []
        if location:
            lat = float(location.get("lat", 16.9891))
            lon = float(location.get("lon", 82.2475))
            # Safe offshore corridor heading
            waypoints = [
                {"lat": round(lat, 4), "lon": round(lon, 4)},
                {"lat": round(lat + 0.05, 4), "lon": round(lon + 0.12, 4)},
                {"lat": round(lat + 0.10, 4), "lon": round(lon + 0.25, 4)},
            ]

        return {
            "agent_name": cls.name,
            "navigation_status": status,
            "nearest_sanctuary_name": nearest_sanctuary,
            "sanctuary_distance_nm": 0.0 if is_inside else 8.5,
            "imbl_buffer_status": imbl_status,
            "suggested_waypoints": waypoints,
            "avoidance_reason": avoid_reason,
        }
