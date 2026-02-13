"""Tests for Arrow Setup CRUD endpoints."""
from fastapi.testclient import TestClient


ARROW_DATA = {
    "make": "Easton",
    "model": "ACE",
    "spine": 570,
    "length_in": 27.5,
    "point_weight_gr": 120,
    "total_arrow_weight_gr": 350,
    "shaft_diameter_mm": 5.0,
    "fletching_type": "spin wing",
    "nock_type": "pin",
    "arrow_count": 12,
}


def test_create_arrow(client: TestClient):
    response = client.post("/api/arrows", json=ARROW_DATA)
    assert response.status_code == 201
    data = response.json()
    assert data["make"] == "Easton"
    assert data["model"] == "ACE"
    assert data["spine"] == 570
    assert "id" in data


def test_list_arrows(client: TestClient):
    client.post("/api/arrows", json=ARROW_DATA)
    client.post("/api/arrows", json={**ARROW_DATA, "model": "X10"})

    response = client.get("/api/arrows")
    assert response.status_code == 200
    assert len(response.json()) >= 2


def test_get_arrow(client: TestClient):
    created = client.post("/api/arrows", json=ARROW_DATA).json()

    response = client.get(f"/api/arrows/{created['id']}")
    assert response.status_code == 200
    assert response.json()["make"] == "Easton"


def test_get_arrow_not_found(client: TestClient):
    response = client.get("/api/arrows/nonexistent")
    assert response.status_code == 404


def test_update_arrow(client: TestClient):
    created = client.post("/api/arrows", json=ARROW_DATA).json()

    response = client.put(
        f"/api/arrows/{created['id']}",
        json={"spine": 500, "model": "X10"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["spine"] == 500
    assert data["model"] == "X10"
    assert data["make"] == "Easton"  # unchanged


def test_delete_arrow(client: TestClient):
    created = client.post("/api/arrows", json=ARROW_DATA).json()

    response = client.delete(f"/api/arrows/{created['id']}")
    assert response.status_code == 204

    response = client.get(f"/api/arrows/{created['id']}")
    assert response.status_code == 404


def test_arrow_shafts_crud(client: TestClient):
    """Test adding, listing, and clearing shafts on an arrow setup."""
    created = client.post("/api/arrows", json=ARROW_DATA).json()
    arrow_id = created["id"]

    # Import shafts (endpoint takes a list)
    shafts_data = [
        {"arrow_number": 1, "measured_weight_gr": 349.5, "measured_spine_astm": 572, "straightness": 0.001},
        {"arrow_number": 2, "measured_weight_gr": 350.1, "measured_spine_astm": 570, "straightness": 0.002},
    ]
    resp = client.post(f"/api/arrows/{arrow_id}/shafts", json=shafts_data)
    assert resp.status_code == 201
    assert len(resp.json()) == 2

    # List shafts
    resp = client.get(f"/api/arrows/{arrow_id}/shafts")
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    # Clear all shafts
    resp = client.delete(f"/api/arrows/{arrow_id}/shafts")
    assert resp.status_code == 204

    resp = client.get(f"/api/arrows/{arrow_id}/shafts")
    assert resp.status_code == 200
    assert len(resp.json()) == 0
