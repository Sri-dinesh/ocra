import logging
import datetime
import math
import os
from typing import Any
from app.connectors.base import DataConnector
from app.core.config import settings

logger = logging.getLogger(__name__)

class CopernicusConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        if settings.USE_MOCK_CONNECTORS:
            logger.info("Using mock Copernicus data")
            from app.connectors.mock_fallback import get_mock_ocean_state
            mock_data = get_mock_ocean_state(lat, lon, time_window)
            return {
                "sst_c": mock_data.get("sst_c"),
                "current_speed_ms": mock_data.get("current_speed_ms"),
                "current_dir_deg": mock_data.get("current_dir_deg")
            }
            
        logger.info(f"Fetching real Copernicus data for {lat}, {lon}")
        
        try:
            # Note: copernicusmarine package is required for this to work natively.
            import copernicusmarine
            
            # Global Ocean Physics Analysis and Forecast
            dataset_id = "cmems_mod_glo_phy-all_anfc_0.083deg_P1D-m"
            
            # Define bounding box (tight around point)
            time_str = time_window.strftime("%Y-%m-%d %H:%M:%S")
            
            ds = copernicusmarine.read_dataframe(
                dataset_id=dataset_id,
                variables=["thetao", "uo", "vo"],
                minimum_longitude=lon - 0.1,
                maximum_longitude=lon + 0.1,
                minimum_latitude=lat - 0.1,
                maximum_latitude=lat + 0.1,
                start_datetime=time_str,
                end_datetime=time_str,
                minimum_depth=0.0,
                maximum_depth=0.5,
                username=os.getenv("COPERNICUS_MARINE_USERNAME"),
                password=os.getenv("COPERNICUS_MARINE_PASSWORD")
            )
            
            if not ds.empty:
                # Average the block
                sst = ds["thetao"].mean()
                u = ds["uo"].mean()
                v = ds["vo"].mean()
                
                # Speed and direction
                speed = math.sqrt(u**2 + v**2)
                
                # Direction from u, v
                dir_rad = math.atan2(v, u)
                dir_deg = math.degrees(dir_rad)
                if dir_deg < 0:
                    dir_deg += 360
                    
                return {
                    "sst_c": round(float(sst), 2),
                    "current_speed_ms": round(float(speed), 2),
                    "current_dir_deg": round(float(dir_deg), 1)
                }
            return {"sst_c": None, "current_speed_ms": None, "current_dir_deg": None}
            
        except ImportError:
            logger.error("copernicusmarine package is not installed. Please run `pip install copernicusmarine`.")
            return None
        except Exception as e:
            logger.error(f"Failed to fetch Copernicus data: {e}")
            return None
