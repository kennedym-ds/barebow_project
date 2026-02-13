"""Tests for Analysis endpoints."""

from fastapi.testclient import TestClient

# --- helpers ---

BOW_DATA = {
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
    "nocking_point_height_mm": 10.0,
}

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


def _create_equipment(client: TestClient):
    """Create bow + arrow, return their IDs."""
    bow = client.post("/api/bows", json=BOW_DATA).json()
    arrow = client.post("/api/arrows", json=ARROW_DATA).json()
    return bow["id"], arrow["id"]


# --- tests ---


def test_predict_score(client: TestClient):
    response = client.post(
        "/api/analysis/predict-score",
        json={
            "known_score": 9.0,
            "known_distance_m": 18,
            "known_face_cm": 40,
            "target_distance_m": 30,
            "target_face_cm": 80,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "predicted_score" in data
    assert "predicted_sigma" in data


def test_virtual_coach(client: TestClient):
    bow_id, arrow_id = _create_equipment(client)

    response = client.post(
        "/api/analysis/virtual-coach",
        json={
            "bow_id": bow_id,
            "arrow_id": arrow_id,
            "short_score": 9.0,
            "short_distance_m": 18,
            "short_face_cm": 40,
            "long_score": 7.5,
            "long_distance_m": 50,
            "long_face_cm": 122,
        },
    )
    assert response.status_code == 200


def test_virtual_coach_bow_not_found(client: TestClient):
    _, arrow_id = _create_equipment(client)
    response = client.post(
        "/api/analysis/virtual-coach",
        json={
            "bow_id": "nonexistent",
            "arrow_id": arrow_id,
            "short_score": 9,
            "short_distance_m": 18,
            "short_face_cm": 40,
            "long_score": 7,
            "long_distance_m": 50,
            "long_face_cm": 122,
        },
    )
    assert response.status_code == 404


def test_safety_check(client: TestClient):
    bow_id, arrow_id = _create_equipment(client)
    response = client.post(
        "/api/analysis/safety-check",
        json={
            "bow_id": bow_id,
            "arrow_id": arrow_id,
        },
    )
    assert response.status_code == 200
    assert "warnings" in response.json()


def test_setup_efficiency(client: TestClient):
    bow_id, arrow_id = _create_equipment(client)
    response = client.post(
        "/api/analysis/setup-efficiency",
        json={
            "bow_id": bow_id,
            "arrow_id": arrow_id,
            "discipline": "indoor",
        },
    )
    assert response.status_code == 200
