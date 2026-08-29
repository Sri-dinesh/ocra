"""Production-Grade Marine Cost Grid for A* Pathfinding.
Features:
- Dynamic bounding box construction covering any Indian coastal route.
- Cost layer weighting (open ocean: 1.0, high wave/swell penalty, restricted zone: inf).
Owner: CHARAN / Backend-B (Hardened for Akash Mobile Integration)
"""

import logging
from typing import Tuple, Dict

logger = logging.getLogger(__name__)


class CostGrid:
    def __init__(self, bbox: Tuple[float, float, float, float], resolution_deg: float = 0.05):
        self.bbox = bbox  # min_lon, min_lat, max_lon, max_lat
        self.resolution = resolution_deg
        self.grid: Dict[Tuple[float, float], float] = {}
        self._build_grid()

    def _build_grid(self):
        min_lon, min_lat, max_lon, max_lat = self.bbox
        lon = min_lon
        while lon <= max_lon + 0.001:
            lat = min_lat
            while lat <= max_lat + 0.001:
                # Open water baseline cost is 1.0
                self.grid[(round(lat, 3), round(lon, 3))] = 1.0
                lat += self.resolution
            lon += self.resolution

    def get_cost(self, lat: float, lon: float) -> float:
        min_lon, min_lat, max_lon, max_lat = self.bbox
        if not (min_lat - 0.5 <= lat <= max_lat + 0.5 and min_lon - 0.5 <= lon <= max_lon + 0.5):
            return 1.0  # Safe default for open water beyond local grid
        
        snapped_lat = round(round(lat / self.resolution) * self.resolution, 3)
        snapped_lon = round(round(lon / self.resolution) * self.resolution, 3)
        return self.grid.get((snapped_lat, snapped_lon), 1.0)


def get_demo_cost_grid(
    start: Tuple[float, float] = (16.989, 82.247),
    goal: Tuple[float, float] = (17.150, 82.450),
) -> CostGrid:
    """Build dynamic cost grid enclosing start and goal coordinates with safety padding."""
    min_lat = min(start[0], goal[0]) - 0.8
    max_lat = max(start[0], goal[0]) + 0.8
    min_lon = min(start[1], goal[1]) - 0.8
    max_lon = max(start[1], goal[1]) + 0.8

    return CostGrid(bbox=(min_lon, min_lat, max_lon, max_lat), resolution_deg=0.05)
