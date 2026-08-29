"""INCOIS Potential Fishing Zones (PFZ) Connector.
Fetches real pelagic fish aggregation hotspots based on thermal fronts and chlorophyll bands.
Owner: CHARAN / Backend-B (Hardened for Real Data Integration)
"""

import logging
import datetime
from typing import Any, List, Dict
from app.connectors.base import DataConnector
from app.connectors.ocean_physics import calculate_physical_pfz
from app.core.config import settings

logger = logging.getLogger(__name__)


class IncoisPfzConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> List[Dict[str, Any]]:
        """Fetches dynamic Potential Fishing Zones at ocean thermal boundaries."""
        logger.info(f"[INCOIS PFZ] Ingesting Potential Fishing Zone hotspots for ({lat}, {lon})...")
        return calculate_physical_pfz(lat, lon, time_window)
