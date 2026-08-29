"""Pytest test setup and fixtures for ORCA backend."""

import pytest
from app.db.session import engine, Base
from app.db.init_db import init_db
from app.db.seed_zones import main as seed_zones


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Drop and recreate all relational tables and seed sources/zones."""
    Base.metadata.drop_all(bind=engine)
    init_db()
    try:
        seed_zones()
    except Exception:
        pass
    yield


@pytest.fixture
def anyio_backend():
    return "asyncio"
