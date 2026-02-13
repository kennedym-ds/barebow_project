"""Tests for Scoring endpoints."""
from fastapi.testclient import TestClient


def test_ring_score_center(client: TestClient):
    """Dead-center on a 40cm face should score 10 (or 11 if X)."""
    response = client.get("/api/scoring/ring", params={
        "x": 0, "y": 0, "face_cm": 40, "face_type": "WA", "x_is_11": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 10
    assert data["is_x"] is True


def test_ring_score_x_ring_11(client: TestClient):
    """X ring should score 11 when compound scoring enabled."""
    response = client.get("/api/scoring/ring", params={
        "x": 0, "y": 0, "face_cm": 40, "face_type": "WA", "x_is_11": True,
    })
    assert response.status_code == 200
    assert response.json()["score"] == 11


def test_ring_score_miss(client: TestClient):
    """Shot far off the face should score 0."""
    response = client.get("/api/scoring/ring", params={
        "x": 100, "y": 100, "face_cm": 40, "face_type": "WA",
    })
    assert response.status_code == 200
    assert response.json()["score"] == 0


def test_flint_score(client: TestClient):
    """Flint scoring: center should score 5."""
    response = client.get("/api/scoring/ring", params={
        "x": 0, "y": 0, "face_cm": 40, "face_type": "Flint",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 5
    assert data["is_x"] is False
