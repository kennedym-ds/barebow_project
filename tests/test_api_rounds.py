"""Tests for Round Presets API endpoints."""

from fastapi.testclient import TestClient


def test_list_round_presets(client: TestClient):
    """Test GET /api/rounds/presets - list all round presets."""
    response = client.get("/api/rounds/presets")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 21

    # Check that all expected rounds are present
    round_names = [r["name"] for r in data]
    assert "WA 18m (Indoor)" in round_names
    assert "WA 25m (Indoor)" in round_names
    assert "WA 50m (Barebow)" in round_names
    assert "Half WA 50m" in round_names
    assert "IFAA Flint (Indoor)" in round_names
    # Legacy aliases
    assert "WA 18m" in round_names
    assert "Flint" in round_names

    # Verify structure of first preset
    wa_18m = next(r for r in data if r["name"] == "WA 18m")
    assert wa_18m["arrow_count"] == 60
    assert wa_18m["ends"] == 20
    assert wa_18m["arrows_per_end"] == 3
    assert wa_18m["distance_m"] == 18.0
    assert wa_18m["face_size_cm"] == 40
    assert wa_18m["max_score"] == 600
    assert wa_18m["scoring_type"] == "wa"
    assert wa_18m["multi_distance"] is False


def test_get_round_preset_by_name_exact(client: TestClient):
    """Test GET /api/rounds/presets/{name} - exact name match."""
    response = client.get("/api/rounds/presets/WA 18m")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "WA 18m"
    assert data["arrow_count"] == 60
    assert data["ends"] == 20
    assert data["arrows_per_end"] == 3
    assert data["distance_m"] == 18.0
    assert data["face_size_cm"] == 40
    assert data["max_score"] == 600
    assert data["scoring_type"] == "wa"
    assert data["multi_distance"] is False


def test_get_round_preset_by_name_case_insensitive(client: TestClient):
    """Test GET /api/rounds/presets/{name} - case insensitive."""
    # Test lowercase
    response = client.get("/api/rounds/presets/flint")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Flint"
    assert data["arrow_count"] == 56
    assert data["multi_distance"] is True

    # Test uppercase
    response = client.get("/api/rounds/presets/INDOOR FIELD")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Indoor Field"
    assert data["scoring_type"] == "field"


def test_get_round_preset_not_found(client: TestClient):
    """Test GET /api/rounds/presets/{name} - 404 for non-existent round."""
    response = client.get("/api/rounds/presets/NonExistent Round")
    assert response.status_code == 404

    data = response.json()
    assert "detail" in data
    assert "NonExistent Round" in data["detail"]


def test_get_wa_50m_preset(client: TestClient):
    """Test WA 50m preset details."""
    response = client.get("/api/rounds/presets/WA 50m")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "WA 50m"
    assert data["arrow_count"] == 72
    assert data["ends"] == 12
    assert data["arrows_per_end"] == 6
    assert data["distance_m"] == 50.0
    assert data["face_size_cm"] == 122
    assert data["max_score"] == 720
    assert data["scoring_type"] == "wa"
    assert data["multi_distance"] is False


def test_get_half_wa_50m_preset(client: TestClient):
    """Test Half WA 50m preset details."""
    response = client.get("/api/rounds/presets/Half WA 50m")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "Half WA 50m"
    assert data["arrow_count"] == 36
    assert data["ends"] == 6
    assert data["arrows_per_end"] == 6
    assert data["max_score"] == 360


def test_get_indoor_field_preset(client: TestClient):
    """Test Indoor Field preset with field scoring."""
    response = client.get("/api/rounds/presets/Indoor Field")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "Indoor Field"
    assert data["scoring_type"] == "field"
    assert data["max_score"] == 300  # 60 arrows × 5


def test_get_flint_preset(client: TestClient):
    """Test Flint preset with multi-distance flag."""
    response = client.get("/api/rounds/presets/Flint")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "Flint"
    assert data["arrow_count"] == 56
    assert data["ends"] == 14
    assert data["arrows_per_end"] == 4
    assert data["multi_distance"] is True
    assert data["distance_m"] == 0.0  # Variable distance
    assert data["face_size_cm"] == 0  # Variable face size


def test_preset_data_consistency(client: TestClient):
    """Test that all presets have consistent data."""
    response = client.get("/api/rounds/presets")
    assert response.status_code == 200

    presets = response.json()
    for preset in presets:
        # All presets should have required fields
        assert "name" in preset
        assert "arrow_count" in preset
        assert "ends" in preset
        assert "arrows_per_end" in preset
        assert "distance_m" in preset
        assert "face_size_cm" in preset
        assert "max_score" in preset
        assert "scoring_type" in preset
        assert "multi_distance" in preset

        # Arrow count should equal ends × arrows_per_end
        assert preset["arrow_count"] == preset["ends"] * preset["arrows_per_end"], (
            f"{preset['name']}: arrow count mismatch"
        )

        # Scoring type should be valid
        assert preset["scoring_type"] in ["wa", "field", "flint"], f"{preset['name']}: invalid scoring type"
