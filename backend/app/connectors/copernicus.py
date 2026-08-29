"""Copernicus Marine Service (CMEMS) Connector.
Owner: CHARAN (Backend-B)
"""

from typing import Dict, Any, Optional
from app.connectors.base import BaseDataConnector


class CopernicusConnector(BaseDataConnector):
    async def fetch(self, lat: float, lon: float, time_window: Optional[str] = None) -> Dict[str, Any]:
        # TODO (CHARAN): Implement Copernicus subset fetching in Phase 2
        return {
            "sst_c": 28.2,
            "chl_a_mgm3": 1.4,
            "source": "Copernicus CMEMS",
        }
