"""Tests for Session and End endpoints."""
from fastapi.testclient import TestClient


def test_create_session(client: TestClient):
    """Test creating a session."""
    # First create bow and arrow setups
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
    bow_response = client.post("/api/bows", json=bow_data)
    bow_id = bow_response.json()["id"]
    
    arrow_data = {
        "make": "Easton",
        "model": "Inspire",
        "spine": 500,
        "length_in": 30.5,
        "point_weight_gr": 100,
        "total_arrow_weight_gr": 350,
        "shaft_diameter_mm": 6.5,
        "fletching_type": "Vanes",
        "nock_type": "Pin"
    }
    arrow_response = client.post("/api/arrows", json=arrow_data)
    arrow_id = arrow_response.json()["id"]
    
    # Create session
    session_data = {
        "bow_id": bow_id,
        "arrow_id": arrow_id,
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Practice session"
    }
    
    response = client.post("/api/sessions", json=session_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["round_type"] == "WA 18m"
    assert data["bow_id"] == bow_id
    assert data["arrow_id"] == arrow_id
    assert "id" in data


def test_save_end(client: TestClient):
    """Test saving an end with shots."""
    # Create session first
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Test session"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Save an end with 3 shots
    end_data = {
        "end_number": 1,
        "shots": [
            {"score": 10, "is_x": True, "x": 0.5, "y": 0.3, "arrow_number": 1},
            {"score": 9, "is_x": False, "x": 1.2, "y": -0.8, "arrow_number": 2},
            {"score": 10, "is_x": False, "x": 0.9, "y": 1.1, "arrow_number": 3}
        ]
    }
    
    response = client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["end_number"] == 1
    assert data["session_id"] == session_id
    assert "id" in data


def test_session_detail(client: TestClient):
    """Test getting full session detail with ends and shots."""
    # Create session
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Test session"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add end with shots
    end_data = {
        "end_number": 1,
        "shots": [
            {"score": 10, "is_x": True, "x": 0.5, "y": 0.3},
            {"score": 9, "is_x": False, "x": 1.2, "y": -0.8},
            {"score": 10, "is_x": False, "x": 0.9, "y": 1.1}
        ]
    }
    client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Get full session detail
    response = client.get(f"/api/sessions/{session_id}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["id"] == session_id
    assert len(data["ends"]) == 1
    assert len(data["ends"][0]["shots"]) == 3
    assert data["ends"][0]["shots"][0]["score"] == 10


def test_delete_session_cascade(client: TestClient):
    """Test that deleting a session cascades to ends and shots."""
    # Create session
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Test session"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add end with shots
    end_data = {
        "end_number": 1,
        "shots": [
            {"score": 10, "is_x": True, "x": 0.5, "y": 0.3},
            {"score": 9, "is_x": False, "x": 1.2, "y": -0.8}
        ]
    }
    client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Delete session
    response = client.delete(f"/api/sessions/{session_id}")
    assert response.status_code == 204
    
    # Verify session is gone
    get_response = client.get(f"/api/sessions/{session_id}")
    assert get_response.status_code == 404


def test_list_sessions_with_stats(client: TestClient):
    """Test listing sessions with computed statistics."""
    # Create session with multiple ends
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Test session"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add multiple ends
    for i in range(1, 3):
        end_data = {
            "end_number": i,
            "shots": [
                {"score": 10, "is_x": False, "x": 0.5, "y": 0.3},
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.8},
                {"score": 8, "is_x": False, "x": 1.5, "y": 1.1}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # List sessions
    response = client.get("/api/sessions")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == session_id
    assert data[0]["total_score"] == 54  # (10+9+8) * 2 ends
    assert data[0]["shot_count"] == 6
    assert data[0]["avg_score"] == 9.0
