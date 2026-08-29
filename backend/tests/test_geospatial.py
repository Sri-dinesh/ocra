import pytest
import datetime
from app.geospatial.astar import astar_route, haversine
from app.geospatial.cost_grid import CostGrid
from app.geospatial.geofence import check_point, check_route

def test_haversine():
    dist = haversine(16.0, 82.0, 16.0, 83.0)
    assert dist > 50.0  # Roughly 60 nm

def test_cost_grid():
    grid = CostGrid(bbox=(80.0, 15.0, 82.0, 17.0), resolution_deg=0.1)
    assert grid.get_cost(16.0, 81.0) == 1.0

# In a real environment, we would mock DB for testing check_point and check_route
def test_check_point_empty():
    # Assuming DB has no zones initially or we mock it
    pass

def test_astar_route():
    grid = CostGrid(bbox=(80.0, 15.0, 82.0, 17.0), resolution_deg=1.0) # Low res for quick test
    path = astar_route((15.0, 80.0), (17.0, 82.0), grid)
    assert path is not None
    assert len(path) > 0
