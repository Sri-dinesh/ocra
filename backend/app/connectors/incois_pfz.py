import logging
import datetime
from typing import Any
from app.connectors.base import DataConnector
from app.connectors.mock_fallback import get_mock_pfz
from app.core.config import settings

logger = logging.getLogger(__name__)

class IncoisPfzConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        if settings.USE_MOCK_CONNECTORS:
            logger.info("Using mock INCOIS PFZ data")
            return get_mock_pfz(lat, lon, time_window)

        # TODO: Implement real INCOIS PFZ HTTP request once endpoint is confirmed
        logger.warning("Real INCOIS PFZ connector not fully implemented, returning None")
        return None
