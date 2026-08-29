import datetime

def get_mock_ocean_state(lat: float, lon: float, time_window: datetime.datetime) -> dict:
    return {
        "sst_c": 28.2,
        "chl_a_mgm3": 1.4,
        "wave_height_m": 1.8,
        "wind_speed_kt": 14.0,
        "current_speed_ms": 0.5,
        "current_dir_deg": 180.0,
        "source_map": {
            "sst_c": "Mock Copernicus",
            "wave_height_m": "Mock INCOIS OSF"
        },
        "quality": "mock"
    }

def get_mock_hazards(lat: float, lon: float, time_window: datetime.datetime) -> list:
    return [] # Empty list = no hazards by default

def get_mock_pfz(lat: float, lon: float, time_window: datetime.datetime) -> list:
    return [
        {
            "lat": lat + 0.1,
            "lon": lon + 0.1,
            "suitability": "high",
            "source": "Mock INCOIS PFZ"
        }
    ]
