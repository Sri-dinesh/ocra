"""Test Suite for Conversation History and Multi-Session Chat APIs."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.conversation import Conversation
from app.models.query_log import QueryLog

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield


def test_create_and_list_conversations():
    # 1. Create a new conversation
    res = client.post(
        "/api/v1/conversations",
        json={"title": "Test Coastal Trip", "role": "fisherman", "language": "en-IN"},
    )
    assert res.status_code == 201
    data = res.json()
    conv_id = data["id"]
    assert data["title"] == "Test Coastal Trip"
    assert data["role"] == "fisherman"

    # 2. List conversations
    list_res = client.get("/api/v1/conversations")
    assert list_res.status_code == 200
    convs = list_res.json()
    assert any(c["id"] == conv_id for c in convs)


def test_query_links_to_conversation():
    # 1. Create conversation
    conv_res = client.post(
        "/api/v1/conversations",
        json={"title": "Kakinada Live Advisory", "role": "fisherman", "language": "en-IN"},
    )
    conv_id = conv_res.json()["id"]

    # 2. Send query with conversation_id
    query_res = client.post(
        "/api/v1/query",
        json={
            "text": "What are the wave height and wind speed at my location?",
            "conversation_id": conv_id,
            "location_hint": {"lat": 16.9891, "lon": 82.2475, "name": "Kakinada"},
        },
    )
    assert query_res.status_code == 200
    q_data = query_res.json()
    assert q_data["conversation_id"] == conv_id

    # 3. Retrieve conversation detail
    detail_res = client.get(f"/api/v1/conversations/{conv_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == conv_id
    assert len(detail["messages"]) == 2  # 1 user + 1 orca
    assert detail["messages"][0]["role"] == "user"
    assert "wave" in detail["messages"][0]["text"].lower()
    assert detail["messages"][1]["role"] == "orca"
    assert detail["messages"][1]["responsePayload"] is not None


def test_rename_and_delete_conversation():
    # 1. Create conversation
    conv_res = client.post(
        "/api/v1/conversations",
        json={"title": "Old Name", "role": "fisherman", "language": "en-IN"},
    )
    conv_id = conv_res.json()["id"]

    # 2. Rename
    patch_res = client.patch(
        f"/api/v1/conversations/{conv_id}",
        json={"title": "Updated Name"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated Name"

    # 3. Delete
    del_res = client.delete(f"/api/v1/conversations/{conv_id}")
    assert del_res.status_code == 204

    # 4. Verify 404
    get_res = client.get(f"/api/v1/conversations/{conv_id}")
    assert get_res.status_code == 404
