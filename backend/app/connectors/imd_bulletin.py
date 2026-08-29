import logging
import datetime
from typing import Any
from app.connectors.base import DataConnector
from app.connectors.mock_fallback import get_mock_hazards
from app.core.config import settings

logger = logging.getLogger(__name__)

class ImdBulletinConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        if settings.USE_MOCK_CONNECTORS:
            logger.info("Using mock IMD Bulletin data")
            return get_mock_hazards(lat, lon, time_window)

        # TODO: Implement real IMD REST API request
        logger.warning("Real IMD Bulletin connector not fully implemented, returning None")
        return None
