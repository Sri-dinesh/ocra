"""Automated test suite for Watchdog Proactive Daemon."""

import pytest
import datetime
from app.watchdog.daemon import watchdog_tick, emit_live_alert
from app.api.v1.watchdog import ACTIVE_ALERT_STORE


def test_watchdog_tick_runs():
    """Verify watchdog tick executes sweep cleanly without errors."""
    watchdog_tick()


def test_live_alert_emission():
    """Verify alert emission pushes live alerts into active alert queue."""
    alert = {
        "alert_type": "IMBL_PROXIMITY",
        "severity": "critical",
        "vessel_id": "test-vessel-99",
        "message": "You are 1.2nm from the International Maritime Boundary Line.",
        "triggered_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    emit_live_alert(alert)
    assert any(a["vessel_id"] == "test-vessel-99" for a in ACTIVE_ALERT_STORE)
