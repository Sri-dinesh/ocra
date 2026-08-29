"""NOAA ERDDAP Connector.
Owner: CHARAN (Backend-B)
"""

from typing import Dict, Any, Optional
from app.connectors.base import BaseDataConnector


class NoaaErddapConnector(BaseDataConnector):
    async def fetch(self, lat: float, lon: float, time_window: Optional[str] = None) -> Dict[str, Any]:
        # TODO (CHARAN): Implement NOAA ERDDAP tabledap query in Phase 2
        return {"chl_a_mgm3": 1.4, "source": "NOAA ERDDAP"}
