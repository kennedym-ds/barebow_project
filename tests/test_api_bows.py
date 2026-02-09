"""Tests for Bow Setup CRUD endpoints."""
from fastapi.testclient import TestClient


def test_create_bow(client: TestClient):
    """Test creating a bow setup."""
    bow_data = {
        "riser_make": "Hoyt",
        "riser_model": "Satori",
        "riser_length_in": 25,
        "limbs_make": "SF",
        "limbs_model": "Premium Plus",
        "limbs_length": "Medium",
        "limbs_marked_poundage": 36,
        "draw_weight_otf": 32,
        "brace_height_in": 8.5,
        "tiller_top_mm": 3.0,
        "tiller_bottom_mm": 3.5,
        "tiller_type": "neutral",
        "plunger_spring_tension": 12,
        "plunger_center_shot_mm": 1.5,
        "nocking_point_height_mm": 10.0
    }
    
    response = client.post("/api/bows", json=bow_data)
    if response.status_code != 201:
        print(f"Response: {response.json()}")
    assert response.status_code == 201
    
    data = response.json()
    assert data["riser_make"] == "Hoyt"
    assert data["limbs_make"] == "SF"
    assert "id" in data
    assert data["name"] == "Hoyt Satori / SF Premium Plus"


def test_list_bows(client: TestClient):
    """Test listing bow setups."""
    # Create two bows
    bow1 = {
        "riser_make": "Hoyt",
        "riser_model": "Satori",
        "riser_length_in": 25,
        "limbs_make": "SF",
        "limbs_model": "Premium Plus",
        "limbs_length": "Medium",
        "limbs_marked_poundage": 36,
        "draw_weight_otf": 32,
        "brace_height_in": 8.5,
        "tiller_top_mm": 3.0,
        "tiller_bottom_mm": 3.5,
        "tiller_type": "neutral",
        "plunger_spring_tension": 12,
        "plunger_center_shot_mm": 1.5,
        "nocking_point_height_mm": 10.0
    }
    
    bow2 = {
        "riser_make": "WNS",
        "riser_model": "Delta LX",
        "riser_length_in": 25,
        "limbs_make": "WNS",
        "limbs_model": "Explore",
        "limbs_length": "Medium",
        "limbs_marked_poundage": 32,
        "draw_weight_otf": 28,
        "brace_height_in": 8.0,
        "tiller_top_mm": 3.0,
        "tiller_bottom_mm": 3.0,
        "tiller_type": "neutral",
        "plunger_spring_tension": 10,
        "plunger_center_shot_mm": 1.0,
        "nocking_point_height_mm": 9.0
    }
    
    client.post("/api/bows", json=bow1)
    client.post("/api/bows", json=bow2)
    
    response = client.get("/api/bows")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 2
    assert data[0]["riser_make"] in ["Hoyt", "WNS"]


def test_get_bow(client: TestClient):
    """Test getting a specific bow setup."""
    bow_data = {
        "riser_make": "Hoyt",
        "riser_model": "Satori",
        "riser_length_in": 25,
        "limbs_make": "SF",
        "limbs_model": "Premium Plus",
        "limbs_length": "Medium",
        "limbs_marked_poundage": 36,
        "draw_weight_otf": 32,
        "brace_height_in": 8.5,
        "tiller_top_mm": 3.0,
        "tiller_bottom_mm": 3.5,
        "tiller_type": "neutral",
        "plunger_spring_tension": 12,
        "plunger_center_shot_mm": 1.5,
        "nocking_point_height_mm": 10.0
    }
    
    create_response = client.post("/api/bows", json=bow_data)
    bow_id = create_response.json()["id"]
    
    response = client.get(f"/api/bows/{bow_id}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["id"] == bow_id
    assert data["draw_weight_otf"] == 32


def test_update_bow(client: TestClient):
    """Test updating a bow setup."""
    bow_data = {
        "riser_make": "Hoyt",
        "riser_model": "Satori",
        "riser_length_in": 25,
        "limbs_make": "SF",
        "limbs_model": "Premium Plus",
        "limbs_length": "Medium",
        "limbs_marked_poundage": 36,
        "draw_weight_otf": 32,
        "brace_height_in": 8.5,
        "tiller_top_mm": 3.0,
        "tiller_bottom_mm": 3.5,
        "tiller_type": "neutral",
        "plunger_spring_tension": 12,
        "plunger_center_shot_mm": 1.5,
        "nocking_point_height_mm": 10.0
    }
    
    create_response = client.post("/api/bows", json=bow_data)
    bow_id = create_response.json()["id"]
    
    # Update draw weight
    update_data = {"draw_weight_otf": 30}
    response = client.put(f"/api/bows/{bow_id}", json=update_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["draw_weight_otf"] == 30
    assert data["riser_make"] == "Hoyt"  # Other fields unchanged


def test_delete_bow(client: TestClient):
    """Test deleting a bow setup."""
    bow_data = {
        "riser_make": "Hoyt",
        "riser_model": "Satori",
        "riser_length_in": 25,
        "limbs_make": "SF",
        "limbs_model": "Premium Plus",
        "limbs_length": "Medium",
        "limbs_marked_poundage": 36,
        "draw_weight_otf": 32,
        "brace_height_in": 8.5,
        "tiller_top_mm": 3.0,
        "tiller_bottom_mm": 3.5,
        "tiller_type": "neutral",
        "plunger_spring_tension": 12,
        "plunger_center_shot_mm": 1.5,
        "nocking_point_height_mm": 10.0
    }
    
    create_response = client.post("/api/bows", json=bow_data)
    bow_id = create_response.json()["id"]
    
    # Delete the bow
    response = client.delete(f"/api/bows/{bow_id}")
    assert response.status_code == 204
    
    # Verify it's gone
    get_response = client.get(f"/api/bows/{bow_id}")
    assert get_response.status_code == 404
