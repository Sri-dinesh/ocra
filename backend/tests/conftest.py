"""Pytest test setup and fixtures for ORCA backend."""

import pytest
from app.db.session import engine, Base
# Import models to ensure registration
from app.models.ocean_state import OceanState
from app.models.zone import Zone
from app.models.hazard import Hazard
from app.models.vessel import Vessel
from app.models.query_log import QueryLog


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all tables before test session runs."""
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup


@pytest.fixture
def anyio_backend():
    return "asyncio"
