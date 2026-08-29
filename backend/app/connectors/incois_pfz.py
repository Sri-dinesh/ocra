"""INCOIS Potential Fishing Zone (PFZ) Connector.
Owner: CHARAN (Backend-B)
"""

from typing import Dict, Any, Optional
from app.connectors.base import BaseDataConnector


class IncoisPfzConnector(BaseDataConnector):
    async def fetch(self, lat: float, lon: float, time_window: Optional[str] = None) -> Dict[str, Any]:
        # TODO (CHARAN): Implement INCOIS PFZ retrieval in Phase 2
        return {"pfz_candidates": []}
