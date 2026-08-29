import logging
import datetime
import httpx
import math
import csv
import io
from typing import Any
from app.connectors.base import DataConnector
from app.core.config import settings

logger = logging.getLogger(__name__)

class IncoisOsfConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        if settings.USE_MOCK_CONNECTORS:
            logger.info("Using mock INCOIS OSF data")
            from app.connectors.mock_fallback import get_mock_ocean_state
            mock_data = get_mock_ocean_state(lat, lon, time_window)
            return {
                "wave_height_m": mock_data.get("wave_height_m"),
                "wind_speed_kt": mock_data.get("wind_speed_kt")
            }

        logger.info(f"Fetching real INCOIS OSF NCSS data for {lat}, {lon}")
        
        # We know from THREDDS investigation that the date is part of the filename.
        # For this prototype, we'll use a fixed recent dataset name, but in production,
        # this would dynamically resolve the latest catalog URL.
        dataset_name = "rsmc_combined_ww3_20260828.nc" 
        
        base_url = f"https://www.incois.gov.in/thredds/ncss/grid/osf/ww3/{dataset_name}"
        
        # Round coordinates for query safety and formatting
        # NCSS expects ISO 8601 time
        time_str = time_window.strftime("%Y-%m-%dT%H:00:00Z")
        
        params = {
            "var": ["HS", "UWND", "VWND"],
            "latitude": lat,
            "longitude": lon,
            "time": time_str,
            "accept": "csv"
        }
        
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(base_url, params=params)
                response.raise_for_status()
                
                # Parse the CSV response
                # Example: time,station,latitude,longitude,HS,UWND,VWND
                # 2026-08... ,GridPoint..., 16.0, 82.0, 1.48, 5.0, -2.0
                content = response.text
                reader = csv.DictReader(io.StringIO(content))
                
                for row in reader:
                    # Find the dynamic keys based on their prefix (since they have units appended)
                    hs_key = next((k for k in row.keys() if k.startswith("HS")), None)
                    uwnd_key = next((k for k in row.keys() if k.startswith("UWND")), None)
                    vwnd_key = next((k for k in row.keys() if k.startswith("VWND")), None)
                    
                    if hs_key and uwnd_key and vwnd_key:
                        hs = float(row[hs_key])
                        u = float(row[uwnd_key])
                        v = float(row[vwnd_key])
                        
                        # Calculate wind speed in m/s then convert to knots
                        wind_speed_ms = math.sqrt(u**2 + v**2)
                        wind_speed_kt = wind_speed_ms * 1.94384
                        
                        return {
                            "wave_height_m": round(hs, 2),
                            "wind_speed_kt": round(wind_speed_kt, 1)
                        }
                        
                return None
                
        except Exception as e:
            logger.error(f"Failed to fetch INCOIS OSF data: {e}")
            return None
