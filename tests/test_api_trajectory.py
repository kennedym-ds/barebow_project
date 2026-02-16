"""Integration tests for the trajectory API endpoints."""

from src.models import ArrowSetup, ArrowShaft, BowSetup, End, Session, Shot, TabSetup  # noqa: F401 — register tables


def test_trajectory_predict(client):
    """POST /api/trajectory/predict returns a solved trajectory."""
    resp = client.post("/api/trajectory/predict", json={
        "launch_velocity_fps": 200,
        "target_distance_m": 18,
        "arrow_mass_gr": 400,
        "shaft_diameter_mm": 5.5,
        "arrow_length_in": 29,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["range_m"] > 0
    assert data["time_of_flight_s"] > 0
    assert len(data["trajectory"]) > 5
    assert "max_height_m" in data
    assert "impact_velocity_mps" in data
    assert "impact_angle_deg" in data
    assert isinstance(data["drop_at_distances"], dict)
    # New output fields
    assert "launch_angle_deg" in data
    assert data["launch_angle_deg"] > 0
    assert data["target_elevation_deg"] == 0.0


def test_trajectory_predict_uphill(client):
    """Uphill target should produce a steeper launch angle."""
    flat = client.post("/api/trajectory/predict", json={
        "launch_velocity_fps": 200,
        "target_distance_m": 30,
        "arrow_mass_gr": 400,
        "shaft_diameter_mm": 5.5,
        "arrow_length_in": 29,
        "target_elevation_deg": 0.0,
    }).json()
    uphill = client.post("/api/trajectory/predict", json={
        "launch_velocity_fps": 200,
        "target_distance_m": 30,
        "arrow_mass_gr": 400,
        "shaft_diameter_mm": 5.5,
        "arrow_length_in": 29,
        "target_elevation_deg": 20.0,
    }).json()
    assert uphill["launch_angle_deg"] > flat["launch_angle_deg"]
    assert uphill["target_elevation_deg"] == 20.0


def test_trajectory_predict_invalid_velocity(client):
    """Negative velocity should be rejected."""
    resp = client.post("/api/trajectory/predict", json={
        "launch_velocity_fps": -10,
        "target_distance_m": 18,
        "arrow_mass_gr": 400,
        "shaft_diameter_mm": 5.5,
        "arrow_length_in": 29,
    })
    assert resp.status_code == 422


def test_trajectory_predict_custom_drag(client):
    """Custom drag coefficient should be accepted."""
    resp = client.post("/api/trajectory/predict", json={
        "launch_velocity_fps": 200,
        "target_distance_m": 18,
        "arrow_mass_gr": 400,
        "shaft_diameter_mm": 5.5,
        "arrow_length_in": 29,
        "drag_coefficient": 0.45,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["range_m"] > 0


def test_drift_predict(client):
    """POST /api/trajectory/drift returns drift data."""
    resp = client.post("/api/trajectory/drift", json={
        "launch_velocity_fps": 200,
        "arrow_mass_gr": 400,
        "shaft_diameter_mm": 5.5,
        "arrow_length_in": 29,
        "target_distance_m": 18,
        "crosswind_speed_mps": 5.0,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["drift_cm"] > 0
    assert data["drift_rings"] >= 0
    assert data["time_of_flight_s"] > 0
    assert isinstance(data["advice"], str)


def test_drift_zero_wind(client):
    """Zero crosswind should produce zero drift."""
    resp = client.post("/api/trajectory/drift", json={
        "launch_velocity_fps": 200,
        "arrow_mass_gr": 400,
        "shaft_diameter_mm": 5.5,
        "arrow_length_in": 29,
        "target_distance_m": 18,
        "crosswind_speed_mps": 0.0,
    })
    assert resp.status_code == 200
    assert resp.json()["drift_cm"] == 0.0


def test_drift_invalid_distance(client):
    """Zero target distance should be rejected."""
    resp = client.post("/api/trajectory/drift", json={
        "launch_velocity_fps": 200,
        "arrow_mass_gr": 400,
        "shaft_diameter_mm": 5.5,
        "arrow_length_in": 29,
        "target_distance_m": 0,
        "crosswind_speed_mps": 5.0,
    })
    assert resp.status_code == 422
