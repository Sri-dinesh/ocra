import logging
import datetime
import httpx
from typing import Any
from app.connectors.base import DataConnector
from app.core.config import settings

logger = logging.getLogger(__name__)

class ObisConnector(DataConnector):
    def fetch(self, lat: float, lon: float, time_window: datetime.datetime) -> Any:
        logger.info(f"[OBIS] Fetching live ocean biodiversity occurrences for ({lat}, {lon})...")
        # Search for occurrences within roughly a 10km radius (approx 0.1 degree)
        geom = f"POLYGON(({lon-0.1} {lat-0.1}, {lon+0.1} {lat-0.1}, {lon+0.1} {lat+0.1}, {lon-0.1} {lat+0.1}, {lon-0.1} {lat-0.1}))"
        
        try:
            with httpx.Client(timeout=3.0) as client:
                response = client.get(
                    "https://api.obis.org/v3/occurrence",
                    params={"geometry": geom, "size": 100}
                )
                response.raise_for_status()
                data = response.json()
                
                results = data.get("results", [])
                species_counts = {}
                for r in results:
                    species = r.get("scientificName", "Unknown")
                    species_counts[species] = species_counts.get(species, 0) + 1
                    
                dominant = max(species_counts, key=species_counts.get) if species_counts else "None"
                
                return {
                    "species_count": len(results),
                    "dominant_species": dominant
                }
        except Exception as e:
            logger.error(f"Failed to fetch OBIS data: {e}")
            return None
