import logging
import datetime
from typing import Any
from erddapy import ERDDAP
from app.connectors.base import DataConnector
from app.core.config import settings

logger = logging.getLogger(__name__)

class NoaaErddapConnector(DataConnector):
    def __init__(self):
        self.server = "https://coastwatch.pfeg.noaa.gov/erddap"
        # VIIRS SNPP Chlorophyll-a, Daily
        self.dataset_id = "nesdisVHNSQchlaDaily"

    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        if settings.USE_MOCK_CONNECTORS:
            logger.info("Using mock NOAA ERDDAP data")
            from app.connectors.mock_fallback import get_mock_ocean_state
            mock_data = get_mock_ocean_state(lat, lon, time_window)
            return {
                "chl_a_mgm3": mock_data.get("chl_a_mgm3")
            }

        logger.info(f"Fetching real NOAA ERDDAP Chl-a for {lat}, {lon}")
        try:
            e = ERDDAP(
                server=self.server,
                protocol="griddap",
                response="csv"
            )
            e.dataset_id = self.dataset_id
            
            # Fetch data for the specific point and day
            e.griddap_initialize()
            
            time_str = time_window.strftime("%Y-%m-%dT12:00:00Z")
            
            e.constraints["time>="] = time_str
            e.constraints["time<="] = time_str
            e.constraints["latitude>="] = lat - 0.05
            e.constraints["latitude<="] = lat + 0.05
            e.constraints["longitude>="] = lon - 0.05
            e.constraints["longitude<="] = lon + 0.05
            e.variables = ["chlor_a"]

            df = e.to_pandas(
                index_col="time (UTC)",
                parse_dates=True,
                dropna=True
            )
            
            if not df.empty:
                # Average the non-NaN values in the bounding box
                chl_val = df["chlor_a (mg m-3)"].mean()
                return {
                    "chl_a_mgm3": round(float(chl_val), 3) if chl_val else None
                }
            return {"chl_a_mgm3": None}
            
        except Exception as e:
            logger.error(f"Failed to fetch NOAA ERDDAP data: {e}")
            return None
