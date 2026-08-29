"""India Meteorological Department (IMD) Bulletin Connector.
Fetches coastal weather warnings, gale advisories, and cyclone track bulletins.
Owner: CHARAN / Backend-B (Hardened for Real Data Integration)
"""

import logging
import datetime
from typing import Any, List, Dict
from app.connectors.base import DataConnector
from app.connectors.ocean_physics import get_live_meteorological_hazards
from app.core.config import settings

logger = logging.getLogger(__name__)


class ImdBulletinConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> List[Dict[str, Any]]:
        """Fetches active IMD weather bulletins and maritime hazard advisories."""
        logger.info(f"[IMD Bulletin] Checking meteorological advisories for ({lat}, {lon})...")
        return get_live_meteorological_hazards(lat, lon, time_window)
