import logging
import datetime
from typing import Any
from app.connectors.base import DataConnector
from app.connectors.mock_fallback import get_mock_ocean_state
from app.core.config import settings

logger = logging.getLogger(__name__)

class CopernicusConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        if settings.USE_MOCK_CONNECTORS:
            logger.info("Using mock Copernicus data")
            mock_data = get_mock_ocean_state(lat, lon, time_window)
            return {
                "sst_c": mock_data.get("sst_c"),
                "current_speed_ms": mock_data.get("current_speed_ms"),
                "current_dir_deg": mock_data.get("current_dir_deg")
            }

        # TODO: Implement real Copernicus Marine Toolbox request using copernicusmarine package
        logger.warning("Real Copernicus connector not fully implemented, returning None")
        return None
