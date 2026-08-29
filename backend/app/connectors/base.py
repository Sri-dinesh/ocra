from abc import ABC, abstractmethod
import datetime
from typing import Any

class DataConnector(ABC):
    """Abstract base class for all data connectors."""

    @abstractmethod
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        """
        Fetch data for a given location and time.
        Must return a structured dict or list depending on the connector,
        or None if the fetch fails (should not raise exceptions).
        """
        pass
