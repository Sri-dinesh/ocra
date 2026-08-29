"""INCOIS Ocean State Forecast (OSF) Connector.
Owner: CHARAN (Backend-B)
"""

from typing import Dict, Any, Optional
from app.connectors.base import BaseDataConnector


class IncoisOsfConnector(BaseDataConnector):
    async def fetch(self, lat: float, lon: float, time_window: Optional[str] = None) -> Dict[str, Any]:
        # TODO (CHARAN): Implement INCOIS OSF retrieval in Phase 2
        return {
            "wave_height_m": 1.8,
            "wind_speed_kt": 14.0,
            "source": "INCOIS OSF",
        }
