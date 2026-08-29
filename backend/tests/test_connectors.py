"""Automated tests for live & physical oceanographic connectors."""

import pytest
import datetime
from app.connectors.copernicus import CopernicusConnector
from app.connectors.incois_pfz import IncoisPfzConnector
from app.connectors.incois_osf import IncoisOsfConnector
from app.connectors.noaa_erddap import NoaaErddapConnector
from app.connectors.obis import ObisConnector


def test_copernicus_connector():
    """Verify Copernicus connector returns valid SST and Current data."""
    c = CopernicusConnector()
    data = c.fetch(16.0, 82.0, datetime.datetime.now(datetime.timezone.utc))
    assert data is not None
    assert "sst_c" in data
    assert 25.0 <= data["sst_c"] <= 35.0


def test_incois_pfz_connector():
    """Verify INCOIS PFZ connector returns pelagic hotspot candidates."""
    c = IncoisPfzConnector()
    data = c.fetch(16.0, 82.0, datetime.datetime.now(datetime.timezone.utc))
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "sst_c" in data[0]


def test_incois_osf_connector():
    """Verify INCOIS OSF connector returns wave and wind fields."""
    c = IncoisOsfConnector()
    data = c.fetch(16.0, 82.0, datetime.datetime.now(datetime.timezone.utc))
    assert data is not None
    assert "wave_height_m" in data
    assert "wind_speed_kt" in data


def test_noaa_erddap_connector():
    """Verify NOAA ERDDAP connector returns Chlorophyll-a data."""
    c = NoaaErddapConnector()
    data = c.fetch(16.0, 82.0, datetime.datetime.now(datetime.timezone.utc))
    assert data is not None
    assert "chl_a_mgm3" in data
    assert data["chl_a_mgm3"] > 0.0
