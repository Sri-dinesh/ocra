import logging
import datetime
from typing import Any
from app.connectors.base import DataConnector
from app.connectors.mock_fallback import get_mock_ocean_state
from app.core.config import settings

logger = logging.getLogger(__name__)

class NoaaErddapConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        if settings.USE_MOCK_CONNECTORS:
            logger.info("Using mock NOAA ERDDAP data")
            mock_data = get_mock_ocean_state(lat, lon, time_window)
            return {
                "chl_a_mgm3": mock_data.get("chl_a_mgm3")
            }

        # TODO: Implement real NOAA ERDDAP request (e.g., via erddapy)
        logger.warning("Real NOAA ERDDAP connector not fully implemented, returning None")
        return None
