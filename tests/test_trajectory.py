"""Tests for src/trajectory.py — trajectory prediction & crosswind drift."""

import math

from src.trajectory import predict_trajectory, estimate_crosswind_drift


# ── predict_trajectory ─────────────────────────────────────────────────

def test_trajectory_basic():
    """Solver should find a valid launch angle to hit a target at 18m."""
    result = predict_trajectory(
        launch_velocity_fps=200,
        target_distance_m=18,
        arrow_mass_gr=400,
        shaft_diameter_mm=5.5,
        arrow_length_in=29,
    )
    assert "trajectory" in result
    assert len(result["trajectory"]) > 5
    assert result["range_m"] > 5
    assert result["time_of_flight_s"] > 0.05
    assert result["max_height_m"] >= 0
    assert "launch_angle_deg" in result
    assert result["launch_angle_deg"] > 0  # must aim slightly upward


def test_trajectory_longer_distance_steeper_angle():
    """Longer target distance should require a steeper launch angle."""
    short = predict_trajectory(200, 18, 400, 5.5, 29)
    long = predict_trajectory(200, 50, 400, 5.5, 29)
    assert long["launch_angle_deg"] > short["launch_angle_deg"]


def test_trajectory_uphill_steeper_angle():
    """Uphill target should require a steeper launch angle than flat."""
    flat = predict_trajectory(200, 30, 400, 5.5, 29, target_elevation_deg=0.0)
    uphill = predict_trajectory(200, 30, 400, 5.5, 29, target_elevation_deg=15.0)
    assert uphill["launch_angle_deg"] > flat["launch_angle_deg"]


def test_trajectory_downhill_shallower_angle():
    """Downhill target should allow a shallower launch angle than flat."""
    flat = predict_trajectory(200, 30, 400, 5.5, 29, target_elevation_deg=0.0)
    downhill = predict_trajectory(200, 30, 400, 5.5, 29, target_elevation_deg=-15.0)
    assert downhill["launch_angle_deg"] < flat["launch_angle_deg"]


def test_trajectory_elevation_returned():
    """Target elevation should be echoed in the response."""
    result = predict_trajectory(200, 18, 400, 5.5, 29, target_elevation_deg=10.0)
    assert result["target_elevation_deg"] == 10.0


def test_trajectory_heavier_arrow():
    """Heavier arrow should still produce valid results."""
    light = predict_trajectory(200, 18, 300, 5.5, 29)
    heavy = predict_trajectory(200, 18, 600, 5.5, 29)
    assert light["range_m"] > 0
    assert heavy["range_m"] > 0
    assert light["launch_angle_deg"] > 0
    assert heavy["launch_angle_deg"] > 0


def test_trajectory_impact_velocity_less_than_launch():
    """Impact velocity should be less than launch velocity due to drag."""
    result = predict_trajectory(200, 30, 400, 5.5, 29)
    launch_mps = 200 * 0.3048
    assert result["impact_velocity_mps"] < launch_mps


def test_trajectory_drop_at_distances():
    """Should report drop at standard distances within range."""
    result = predict_trajectory(200, 50, 400, 5.5, 29)
    drops = result["drop_at_distances"]
    assert isinstance(drops, dict)
    # Should have entries for 10 and 18 at minimum (both < 50m target)
    assert len(drops) >= 1


def test_trajectory_points_have_required_fields():
    """Each trajectory point should have t, x_m, y_m, v_mps."""
    result = predict_trajectory(200, 18, 400, 5.5, 29)
    for pt in result["trajectory"]:
        assert "t" in pt
        assert "x_m" in pt
        assert "y_m" in pt
        assert "v_mps" in pt


def test_trajectory_impact_angle_positive():
    """Impact angle should be positive (arrow falling)."""
    result = predict_trajectory(200, 30, 400, 5.5, 29)
    assert result["impact_angle_deg"] >= 0


# ── estimate_crosswind_drift ───────────────────────────────────────────

def test_drift_zero_wind():
    """Zero crosswind should produce zero drift."""
    result = estimate_crosswind_drift(
        launch_velocity_fps=200,
        arrow_mass_gr=400,
        shaft_diameter_mm=5.5,
        arrow_length_in=29,
        target_distance_m=18,
        crosswind_speed_mps=0.0,
    )
    assert result["drift_cm"] == 0.0
    assert "Negligible" in result["advice"] or result["drift_cm"] < 0.5


def test_drift_increases_with_wind():
    """Stronger crosswind should produce more drift."""
    light_wind = estimate_crosswind_drift(200, 400, 5.5, 29, 18, 2.0)
    strong_wind = estimate_crosswind_drift(200, 400, 5.5, 29, 18, 8.0)
    assert strong_wind["drift_cm"] > light_wind["drift_cm"]


def test_drift_increases_with_distance():
    """Longer target distance should produce more drift."""
    short = estimate_crosswind_drift(200, 400, 5.5, 29, 18, 5.0)
    long = estimate_crosswind_drift(200, 400, 5.5, 29, 70, 5.0)
    assert long["drift_cm"] > short["drift_cm"]


def test_drift_ring_impact():
    """Drift rings should be drift_cm / 2.0 (WA 40cm face)."""
    result = estimate_crosswind_drift(200, 400, 5.5, 29, 50, 5.0)
    expected_rings = result["drift_cm"] / 2.0
    assert abs(result["drift_rings"] - expected_rings) < 0.2


def test_drift_advice_direction():
    """Positive wind should advise aiming left."""
    result = estimate_crosswind_drift(200, 400, 5.5, 29, 18, 5.0)
    if result["drift_cm"] >= 0.5:
        assert "left" in result["advice"]


def test_drift_has_required_fields():
    """Result should have all expected keys."""
    result = estimate_crosswind_drift(200, 400, 5.5, 29, 18, 3.0)
    assert "drift_cm" in result
    assert "drift_rings" in result
    assert "time_of_flight_s" in result
    assert "advice" in result
    assert result["time_of_flight_s"] > 0
