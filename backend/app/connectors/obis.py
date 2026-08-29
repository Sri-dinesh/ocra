"""OBIS / GBIF Marine Biodiversity Connector.
Owner: CHARAN (Backend-B)
"""

from typing import Dict, Any, Optional
from app.connectors.base import BaseDataConnector


class ObisConnector(BaseDataConnector):
    async def fetch(self, lat: float, lon: float, time_window: Optional[str] = None) -> Dict[str, Any]:
        # TODO (CHARAN): Implement OBIS species occurrence querying in Phase 2
        return {"species_count": 0, "source": "OBIS"}
