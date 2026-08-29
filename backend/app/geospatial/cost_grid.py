import logging
import math

logger = logging.getLogger(__name__)

class CostGrid:
    def __init__(self, bbox: tuple[float, float, float, float], resolution_deg: float = 0.1):
        self.bbox = bbox
        self.resolution = resolution_deg
        # Simplification: A dictionary mapping (lat, lon) to a cost multiplier
        # 1.0 = normal water, inf = land/restricted
        self.grid = {}
        self._build_grid()
        
    def _build_grid(self):
        min_lon, min_lat, max_lon, max_lat = self.bbox
        
        # Build an empty grid
        lon = min_lon
        while lon <= max_lon:
            lat = min_lat
            while lat <= max_lat:
                self.grid[(round(lat, 2), round(lon, 2))] = 1.0
                lat += self.resolution
            lon += self.resolution
            
        logger.info(f"Built base cost grid with {len(self.grid)} cells")
        
    def get_cost(self, lat: float, lon: float) -> float:
        # Snap to nearest grid center
        snapped_lat = round(round(lat / self.resolution) * self.resolution, 2)
        snapped_lon = round(round(lon / self.resolution) * self.resolution, 2)
        
        return self.grid.get((snapped_lat, snapped_lon), float('inf'))

# In-memory cached grid for the demo region (e.g. AP/TN coast)
# Bounding box: Kakinada to Chennai roughly
DEMO_BBOX = (79.0, 12.0, 83.5, 18.0)
cost_grid_instance = CostGrid(DEMO_BBOX, resolution_deg=0.1)

def get_demo_cost_grid() -> CostGrid:
    return cost_grid_instance
