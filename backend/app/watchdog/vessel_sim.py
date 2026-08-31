"""Vessel Position Drift Modeling for Watchdog Daemon."""

import random
from typing import Tuple


def simulate_vessel_drift(lat: float, lon: float) -> Tuple[float, float]:
    """Calculates slight natural ocean surface drift displacement."""
    new_lat = round(lat + random.uniform(-0.005, 0.005), 4)
    new_lon = round(lon + random.uniform(0.002, 0.008), 4)
    return new_lat, new_lon
