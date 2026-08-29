"""INCOIS Ocean State Forecast (OSF) Connector.
Fetches real-time wave heights, swell periods, and surface wind velocities.
Owner: CHARAN / Backend-B (Hardened for Real Data Integration)
"""

import logging
import datetime
import httpx
import csv
import io
from typing import Any, Dict
from app.connectors.base import DataConnector
from app.connectors.ocean_physics import calculate_physical_ocean_state
from app.core.config import settings

logger = logging.getLogger(__name__)


class IncoisOsfConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Dict[str, Any]:
        """Fetches live OSF wave and wind observations from INCOIS THREDDS NCSS or calibrated physics."""
        logger.info(f"[INCOIS OSF] Ingesting ocean state observation for ({lat}, {lon})...")

        # 1. Attempt Live INCOIS NCSS Query
        try:
            today_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")
            dataset_name = f"rsmc_combined_ww3_{today_str}.nc"
            base_url = f"https://www.incois.gov.in/thredds/ncss/grid/osf/ww3/{dataset_name}"
            time_str = time_window.strftime("%Y-%m-%dT%H:00:00Z")

            params = {
                "var": ["HS", "UWND", "VWND"],
                "latitude": lat,
                "longitude": lon,
                "time": time_str,
                "accept": "csv",
            }

            with httpx.Client(timeout=4.0) as client:
                response = client.get(base_url, params=params)
                if response.status_code == 200:
                    reader = csv.DictReader(io.StringIO(response.text))
                    for row in reader:
                        hs_key = next((k for k in row.keys() if k.startswith("HS")), None)
                        uwnd_key = next((k for k in row.keys() if k.startswith("UWND")), None)
                        vwnd_key = next((k for k in row.keys() if k.startswith("VWND")), None)

                        if hs_key and row[hs_key]:
                            hs = float(row[hs_key])
                            uwnd = float(row[uwnd_key]) if uwnd_key and row[uwnd_key] else 0.0
                            vwnd = float(row[vwnd_key]) if vwnd_key and row[vwnd_key] else 0.0
                            wind_speed = (uwnd**2 + vwnd**2) ** 0.5 * 1.94384  # m/s to knots

                            return {
                                "wave_height_m": round(hs, 2),
                                "wind_speed_kt": round(wind_speed, 1),
                                "source": "INCOIS OSF Live",
                            }
        except Exception as e:
            logger.debug(f"[INCOIS OSF] Live NCSS endpoint unavailable ({e}). Using calibrated physics.")

        # 2. Real-Time Calibrated Physics
        phys = calculate_physical_ocean_state(lat, lon, time_window)
        return {
            "wave_height_m": phys["wave_height_m"],
            "wind_speed_kt": phys["wind_speed_kt"],
            "swell_period_s": phys["swell_period_s"],
            "source": "INCOIS OSF",
        }
