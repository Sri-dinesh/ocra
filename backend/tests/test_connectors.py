import pytest
import datetime
from app.connectors.copernicus import CopernicusConnector
from app.connectors.incois_pfz import IncoisPfzConnector
from app.connectors.incois_osf import IncoisOsfConnector
from app.core.config import settings

def test_copernicus_mock():
    # Ensure it uses mock
    settings.USE_MOCK_CONNECTORS = True
    c = CopernicusConnector()
    data = c.fetch(16.0, 82.0, datetime.datetime.now())
    assert data is not None
    assert 'sst_c' in data

def test_incois_pfz_mock():
    settings.USE_MOCK_CONNECTORS = True
    c = IncoisPfzConnector()
    data = c.fetch(16.0, 82.0, datetime.datetime.now())
    assert isinstance(data, list)

def test_incois_osf_mock():
    settings.USE_MOCK_CONNECTORS = True
    c = IncoisOsfConnector()
    data = c.fetch(16.0, 82.0, datetime.datetime.now())
    assert data is not None
    assert 'wave_height_m' in data
