"""Tests for Tab Setup CRUD endpoints."""

from fastapi.testclient import TestClient

TAB_DATA = {
    "make": "Zniper",
    "model": "Barebow Tab",
    "marks": "18m=12mm, 30m=8mm",
}


def test_create_tab(client: TestClient):
    response = client.post("/api/tabs", json=TAB_DATA)
    assert response.status_code == 201
    data = response.json()
    assert data["make"] == "Zniper"
    assert data["name"] == "Zniper Barebow Tab"
    assert "id" in data


def test_list_tabs(client: TestClient):
    client.post("/api/tabs", json=TAB_DATA)
    response = client.get("/api/tabs")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_get_tab(client: TestClient):
    created = client.post("/api/tabs", json=TAB_DATA).json()
    response = client.get(f"/api/tabs/{created['id']}")
    assert response.status_code == 200
    assert response.json()["make"] == "Zniper"


def test_get_tab_not_found(client: TestClient):
    response = client.get("/api/tabs/nonexistent")
    assert response.status_code == 404


def test_update_tab(client: TestClient):
    created = client.post("/api/tabs", json=TAB_DATA).json()
    response = client.put(
        f"/api/tabs/{created['id']}",
        json={"make": "AAE", "model": "KSL Tab"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["make"] == "AAE"
    assert data["name"] == "AAE KSL Tab"


def test_delete_tab(client: TestClient):
    created = client.post("/api/tabs", json=TAB_DATA).json()
    response = client.delete(f"/api/tabs/{created['id']}")
    assert response.status_code == 204

    response = client.get(f"/api/tabs/{created['id']}")
    assert response.status_code == 404
