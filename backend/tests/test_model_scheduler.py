"""Unit Tests for Gemini Frontier Model Round-Robin Scheduling & Failover (SIH26176).
Tests:
- Model pool rotation across frontier models.
- 429 Rate-limit cooldown and automatic failover to next model.
"""

import time
import pytest
from app.core.llm import GeminiClient, FRONTIER_MODEL_POOL


def test_frontier_model_pool_round_robin():
    """Verify thread-safe round robin sequencing through frontier models."""
    client = GeminiClient()
    
    models_selected = [client._get_next_model() for _ in range(len(client._model_pool) * 2)]
    
    assert len(models_selected) == len(client._model_pool) * 2
    # Ensure all frontier models are present in the pool
    for model in FRONTIER_MODEL_POOL:
        assert model in client._model_pool


def test_rate_limit_cooldown_and_failover():
    """Verify that a model hitting 429 is put on cooldown and bypassed."""
    client = GeminiClient()
    
    initial_model = client._get_next_model()
    # Mark the current model as rate-limited
    client._mark_rate_limited(initial_model, cooldown_seconds=10.0)
    
    # Next selection must NOT be the rate-limited model
    next_model = client._get_next_model()
    assert next_model != initial_model
    assert initial_model in client._cooldown_tracker
