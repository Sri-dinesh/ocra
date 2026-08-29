import logging
import datetime
from typing import Any
from app.connectors.base import DataConnector
from app.connectors.mock_fallback import get_mock_ocean_state
from app.core.config import settings

logger = logging.getLogger(__name__)

class IncoisOsfConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        if settings.USE_MOCK_CONNECTORS:
            logger.info("Using mock INCOIS OSF data")
            mock_data = get_mock_ocean_state(lat, lon, time_window)
            return {
                "wave_height_m": mock_data.get("wave_height_m"),
                "wind_speed_kt": mock_data.get("wind_speed_kt")
            }

        # TODO: Implement real INCOIS OSF request (e.g., via xarray/ERDDAP)
        logger.warning("Real INCOIS OSF connector not fully implemented, returning None")
        return None
