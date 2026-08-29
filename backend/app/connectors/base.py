"""Abstract Base Connector Interface.
Owner: CHARAN (Backend-B)
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseDataConnector(ABC):
    """Common interface for all external marine/weather data adapters."""

    @abstractmethod
    async def fetch(self, lat: float, lon: float, time_window: Optional[str] = None) -> Dict[str, Any]:
        """Fetch and normalize data from provider."""
        pass
