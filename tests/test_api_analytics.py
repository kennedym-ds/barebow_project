"""Tests for Analytics endpoints."""
from fastapi.testclient import TestClient


def test_park_model_cross_distance_analysis(client: TestClient):
    """Test Park Model cross-distance analysis endpoint."""
    # Create two sessions: one at 18m, one at 50m
    
    # Session 1: WA 18m - 3 ends x 3 shots = 9 arrows
    session_18m_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Short distance session"
    }
    session_18m_response = client.post("/api/sessions", json=session_18m_data)
    session_18m_id = session_18m_response.json()["id"]
    
    # Add ends with consistent good shooting (avg ~9.0 per arrow)
    for end_num in range(1, 4):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 10, "is_x": True, "x": 0.5, "y": 0.3},
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.8},
                {"score": 8, "is_x": False, "x": 2.1, "y": 1.5}
            ]
        }
        client.post(f"/api/sessions/{session_18m_id}/ends", json=end_data)
    
    # Session 2: WA 50m - 2 ends x 6 shots = 12 arrows
    session_50m_data = {
        "round_type": "WA 50m",
        "target_face_size_cm": 122,
        "distance_m": 50,
        "notes": "Long distance session"
    }
    session_50m_response = client.post("/api/sessions", json=session_50m_data)
    session_50m_id = session_50m_response.json()["id"]
    
    # Add ends with lower scores (avg ~7.0 per arrow due to drag)
    for end_num in range(1, 3):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 8, "is_x": False, "x": 2.1, "y": 1.5},
                {"score": 7, "is_x": False, "x": 3.2, "y": -2.1},
                {"score": 7, "is_x": False, "x": 2.8, "y": 2.4},
                {"score": 7, "is_x": False, "x": 3.5, "y": -1.8},
                {"score": 6, "is_x": False, "x": 4.1, "y": 2.9},
                {"score": 7, "is_x": False, "x": 3.3, "y": -2.6}
            ]
        }
        client.post(f"/api/sessions/{session_50m_id}/ends", json=end_data)
    
    # Test the Park Model endpoint
    response = client.get(
        "/api/analytics/park-model",
        params={
            "short_round_type": "WA 18m",
            "long_round_type": "WA 50m"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert data["short_round"] == "WA 18m"
    assert data["long_round"] == "WA 50m"
    assert data["short_avg_score"] == 9.0  # (10+9+8)*3 / 9
    assert data["long_avg_score"] == 7.0   # (8+7+7+7+6+7)*2 / 12
    assert data["short_session_count"] == 1
    assert data["long_session_count"] == 1
    assert "short_sigma_cm" in data
    assert "long_sigma_cm" in data
    assert "predicted_long_score" in data
    assert "predicted_long_sigma" in data
    assert "drag_loss_points" in data
    assert "drag_loss_percent" in data
    assert "sigma_theta_mrad" in data
    
    # Check that predicted score is better than actual (indicating drag loss)
    assert data["predicted_long_score"] > data["long_avg_score"]
    assert data["drag_loss_points"] > 0


def test_park_model_with_date_filters(client: TestClient):
    """Test Park Model endpoint with date filtering."""
    from datetime import datetime, timedelta
    
    # Create sessions with both round types first
    session_18m_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Old session"
    }
    old_session_response = client.post("/api/sessions", json=session_18m_data)
    old_session_id = old_session_response.json()["id"]
    
    # Add some shots
    end_data = {
        "end_number": 1,
        "shots": [
            {"score": 5, "is_x": False, "x": 5.0, "y": 5.0},
            {"score": 5, "is_x": False, "x": 5.0, "y": 5.0},
            {"score": 5, "is_x": False, "x": 5.0, "y": 5.0}
        ]
    }
    client.post(f"/api/sessions/{old_session_id}/ends", json=end_data)
    
    # Query with date filter far in the future that excludes all sessions
    future_date = (datetime.now() + timedelta(days=1)).isoformat()
    
    response = client.get(
        "/api/analytics/park-model",
        params={
            "short_round_type": "WA 18m",
            "long_round_type": "WA 50m",
            "from_date": future_date
        }
    )
    
    # Should return 200 but with 0 sessions matched
    assert response.status_code == 200
    data = response.json()
    assert data["short_session_count"] == 0


def test_score_context_endpoint(client: TestClient):
    """Test score context endpoint with round preset data."""
    # Create a complete WA 18m session (60 arrows)
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Full round"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add 20 ends x 3 shots = 60 arrows (complete round)
    total_score = 0
    for end_num in range(1, 21):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 9, "is_x": False, "x": 1.0, "y": 1.0},
                {"score": 8, "is_x": False, "x": 2.0, "y": 2.0},
                {"score": 9, "is_x": False, "x": 1.0, "y": -1.0}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
        total_score += 9 + 8 + 9  # 26 per end
    
    # Query the score context endpoint
    response = client.get(
        "/api/analytics/score-context",
        params={"round_type": "WA 18m"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    session_ctx = data[0]
    
    assert session_ctx["session_id"] == session_id
    assert session_ctx["round_type"] == "WA 18m"
    assert session_ctx["distance_m"] == 18
    assert session_ctx["total_score"] == total_score
    assert session_ctx["shot_count"] == 60
    assert abs(session_ctx["avg_score"] - (26 / 3)) < 0.01  # Allow small rounding difference
    assert session_ctx["max_score"] == 600  # WA 18m preset
    assert session_ctx["score_percentage"] > 0
    assert session_ctx["preset_arrow_count"] == 60
    assert session_ctx["round_complete"] is True
    assert "sigma_cm" in session_ctx
    assert "cep_50" in session_ctx


def test_score_context_incomplete_round(client: TestClient):
    """Test score context with incomplete round (fewer arrows than preset)."""
    # Create a partial WA 18m session (only 12 arrows instead of 60)
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Partial round"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add 4 ends x 3 shots = 12 arrows
    for end_num in range(1, 5):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 10, "is_x": True, "x": 0.5, "y": 0.3},
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.8},
                {"score": 9, "is_x": False, "x": 1.0, "y": 1.0}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    response = client.get(
        "/api/analytics/score-context",
        params={"round_type": "WA 18m"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    session_ctx = data[0]
    
    assert session_ctx["shot_count"] == 12
    assert session_ctx["preset_arrow_count"] == 60
    assert session_ctx["round_complete"] is False
    assert session_ctx["max_score"] == 600  # Still based on preset


def test_score_context_unknown_round(client: TestClient):
    """Test score context with custom/unknown round type."""
    # Create session with custom round type
    session_data = {
        "round_type": "Custom Practice",
        "target_face_size_cm": 60,
        "distance_m": 30,
        "notes": "Custom round"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add 2 ends x 5 shots = 10 arrows
    for end_num in range(1, 3):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 8, "is_x": False, "x": 2.0, "y": 2.0},
                {"score": 7, "is_x": False, "x": 3.0, "y": 3.0},
                {"score": 9, "is_x": False, "x": 1.5, "y": 1.5},
                {"score": 8, "is_x": False, "x": 2.5, "y": 2.5},
                {"score": 6, "is_x": False, "x": 4.0, "y": 4.0}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    response = client.get(
        "/api/analytics/score-context",
        params={"round_type": "Custom Practice"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    session_ctx = data[0]
    
    assert session_ctx["shot_count"] == 10
    assert session_ctx["max_score"] == 100  # Fallback: 10 arrows * 10
    assert session_ctx["preset_arrow_count"] is None
    assert session_ctx["round_complete"] is False  # Unknown if complete


def test_bias_analysis_basic(client: TestClient):
    """Test basic bias analysis with right-biased shots."""
    # Create session with systematic right bias
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Right bias test"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add 3 ends with systematic right bias (positive x)
    for end_num in range(1, 4):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 9, "is_x": False, "x": 3.0, "y": 0.5},    # Right
                {"score": 9, "is_x": False, "x": 3.5, "y": -0.3},   # Right
                {"score": 8, "is_x": False, "x": 2.8, "y": 0.8}     # Right
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Query bias analysis
    response = client.get("/api/analytics/bias-analysis")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify MPI
    assert data["total_shots"] == 9
    assert data["mpi_x_cm"] > 2.5  # Should be around 3.1
    assert abs(data["mpi_y_cm"]) < 1.0  # Close to 0
    assert data["mpi_x_normalized"] > 0  # Positive x = right
    
    # Verify directional bias
    assert data["bias_direction"] in ["E", "SE", "NE"]  # East-ish
    assert data["bias_magnitude_cm"] > 2.5
    assert data["bias_magnitude_normalized"] > 0
    
    # Verify H/V ratio is present
    assert "sigma_x_cm" in data
    assert "sigma_y_cm" in data
    assert "hv_ratio" in data
    assert "hv_interpretation" in data


def test_bias_analysis_hv_ratio(client: TestClient):
    """Test horizontal/vertical bias ratio calculation."""
    # Create session with horizontal spread (wide x, narrow y)
    session_data = {
        "round_type": "WA 25m",
        "target_face_size_cm": 60,
        "distance_m": 25,
        "notes": "Horizontal spread test"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Wide horizontal spread, tight vertical
    end_data = {
        "end_number": 1,
        "shots": [
            {"score": 8, "is_x": False, "x": -4.0, "y": 0.5},   # Left
            {"score": 8, "is_x": False, "x": 4.0, "y": -0.5},   # Right
            {"score": 8, "is_x": False, "x": -3.5, "y": 0.3},   # Left
            {"score": 8, "is_x": False, "x": 3.5, "y": -0.3},   # Right
            {"score": 8, "is_x": False, "x": 0.0, "y": 0.0}     # Center
        ]
    }
    client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    response = client.get("/api/analytics/bias-analysis")
    
    assert response.status_code == 200
    data = response.json()
    
    # H/V ratio should be > 1.2 (horizontal-dominant)
    assert data["hv_ratio"] > 1.2
    assert data["hv_interpretation"] == "Horizontal-dominant"


def test_bias_analysis_end_fatigue(client: TestClient):
    """Test end fatigue analysis with declining scores."""
    # Create session with declining performance over ends
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Fatigue test"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Simulate fatigue: end 1 = 9,9,10, end 2 = 8,9,9, end 3 = 7,8,8, end 4 = 6,7,7
    fatigue_patterns = [
        [10, 9, 9],  # End 1: avg 9.33
        [9, 9, 8],   # End 2: avg 8.67
        [8, 8, 7],   # End 3: avg 7.67
        [7, 7, 6]    # End 4: avg 6.67
    ]
    
    for end_num, scores in enumerate(fatigue_patterns, 1):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": scores[0], "is_x": False, "x": 1.0 * end_num, "y": 0.5},
                {"score": scores[1], "is_x": False, "x": 1.2 * end_num, "y": -0.3},
                {"score": scores[2], "is_x": False, "x": 0.8 * end_num, "y": 0.8}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    response = client.get("/api/analytics/bias-analysis")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify fatigue metrics
    assert data["fatigue_slope"] < -0.5  # Negative slope = degrading
    assert data["fatigue_correlation"] < -0.8  # Strong negative correlation
    assert "fatigue" in data["fatigue_interpretation"].lower() or "drop" in data["fatigue_interpretation"].lower()
    assert len(data["end_scores"]) == 4
    
    # Verify end scores structure
    assert data["end_scores"][0]["end_number"] == 1
    assert abs(data["end_scores"][0]["avg_score"] - 9.33) < 0.01
    assert data["end_scores"][0]["shot_count"] == 3


def test_bias_analysis_first_arrow_penalty(client: TestClient):
    """Test first arrow penalty detection."""
    # Create session where first arrow of each end is consistently worse
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "First arrow penalty test"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Pattern: first shot = 7, other shots = 9
    for end_num in range(1, 5):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 7, "is_x": False, "x": 3.0, "y": 2.0, "arrow_number": 1},    # First: worse
                {"score": 9, "is_x": False, "x": 1.0, "y": 0.5, "arrow_number": 2},    # Second: better
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.3, "arrow_number": 3}    # Third: better
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    response = client.get("/api/analytics/bias-analysis")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify first arrow analysis
    assert data["first_arrow_avg"] == 7.0  # All first shots = 7
    assert data["other_arrows_avg"] == 9.0  # All other shots = 9
    assert data["first_arrow_penalty"] == -2.0  # 7 - 9 = -2
    assert "penalty" in data["first_arrow_interpretation"].lower() or "-2" in data["first_arrow_interpretation"]


def test_bias_analysis_no_data(client: TestClient):
    """Test bias analysis with no sessions (should return zeros)."""
    response = client.get("/api/analytics/bias-analysis")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_shots"] == 0
    assert data["mpi_x_cm"] == 0.0
    assert data["mpi_y_cm"] == 0.0
    assert data["bias_direction"] == "Center"
    assert data["hv_ratio"] == 1.0
    assert data["fatigue_slope"] == 0.0
    assert data["first_arrow_avg"] == 0.0
    assert len(data["end_scores"]) == 0


def test_bias_analysis_with_filters(client: TestClient):
    """Test bias analysis with round_type and date filters."""
    from datetime import datetime, timedelta
    
    # Create two sessions with different round types
    session_18m_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "18m session"
    }
    session_18m_response = client.post("/api/sessions", json=session_18m_data)
    session_18m_id = session_18m_response.json()["id"]
    
    session_25m_data = {
        "round_type": "WA 25m",
        "target_face_size_cm": 60,
        "distance_m": 25,
        "notes": "25m session"
    }
    session_25m_response = client.post("/api/sessions", json=session_25m_data)
    session_25m_id = session_25m_response.json()["id"]
    
    # Add shots to both
    for session_id in [session_18m_id, session_25m_id]:
        end_data = {
            "end_number": 1,
            "shots": [
                {"score": 9, "is_x": False, "x": 1.0, "y": 0.5},
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.3},
                {"score": 8, "is_x": False, "x": 2.0, "y": 0.8}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Test round_type filter
    response = client.get(
        "/api/analytics/bias-analysis",
        params={"round_type": "WA 18m"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_shots"] == 3  # Only 18m session
    
    # Test multiple round types
    response = client.get(
        "/api/analytics/bias-analysis",
        params={"round_type": "WA 18m,WA 25m"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_shots"] == 6  # Both sessions


def test_advanced_precision_endpoint(client: TestClient):
    """Test advanced precision metrics endpoint."""
    # Create session with shots
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Precision test"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add 3 ends with varying shot patterns
    for end_num in range(1, 4):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 10, "is_x": True, "x": 0.5, "y": 0.3},
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.8},
                {"score": 8, "is_x": False, "x": 2.1, "y": 1.5},
                {"score": 9, "is_x": False, "x": 1.5, "y": 0.9},
                {"score": 7, "is_x": False, "x": 3.0, "y": -1.2}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Query advanced precision endpoint
    response = client.get("/api/analytics/advanced-precision")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure
    assert data["total_shots"] == 15
    assert data["drms_cm"] > 0
    assert data["r95_cm"] > data["drms_cm"]  # R95 should be larger than DRMS
    assert data["extreme_spread_cm"] > data["r95_cm"]
    
    # Rayleigh sigma with CI
    assert "rayleigh_sigma" in data
    assert "rayleigh_ci_lower" in data
    assert "rayleigh_ci_upper" in data
    assert data["rayleigh_ci_lower"] < data["rayleigh_sigma"] < data["rayleigh_ci_upper"]
    
    # Accuracy vs Precision
    assert "accuracy_pct" in data
    assert "precision_pct" in data
    assert abs((data["accuracy_pct"] + data["precision_pct"]) - 100.0) < 1.0  # Should sum to ~100
    assert "accuracy_precision_interpretation" in data
    
    # Confidence ellipse
    assert "ellipse_center_x" in data
    assert "ellipse_center_y" in data
    assert "ellipse_semi_major" in data
    assert "ellipse_semi_minor" in data
    assert "ellipse_angle_deg" in data
    assert "ellipse_correlation" in data
    
    # Flier detection
    assert "flier_count" in data
    assert "flier_pct" in data
    assert "clean_sigma" in data
    assert "full_sigma" in data
    assert "flier_interpretation" in data


def test_trends_endpoint(client: TestClient):
    """Test trends analysis with EWMA and consistency metrics."""
    # Create 5 sessions over time with varying scores
    for i in range(5):
        session_data = {
            "round_type": "WA 18m",
            "target_face_size_cm": 40,
            "distance_m": 18,
            "notes": f"Session {i+1}"
        }
        session_response = client.post("/api/sessions", json=session_data)
        session_id = session_response.json()["id"]
        
        # Vary scores: start low, improve over time
        base_score = 7 + i * 0.5
        end_data = {
            "end_number": 1,
            "shots": [
                {"score": int(base_score), "is_x": False, "x": 2.0 - i*0.3, "y": 1.0},
                {"score": int(base_score + 1), "is_x": False, "x": 1.5 - i*0.2, "y": 0.5},
                {"score": int(base_score), "is_x": False, "x": 2.2 - i*0.3, "y": -0.8}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Query trends endpoint
    response = client.get("/api/analytics/trends")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure
    assert len(data["dates"]) == 5
    assert len(data["round_types"]) == 5
    assert len(data["scores"]) == 5
    assert len(data["sigmas"]) == 5
    
    # EWMA arrays
    assert len(data["score_ewma"]) == 5
    assert len(data["score_ucl"]) == 5
    assert len(data["score_lcl"]) == 5
    assert len(data["sigma_ewma"]) == 5
    assert len(data["sigma_ucl"]) == 5
    assert len(data["sigma_lcl"]) == 5
    
    # Consistency
    assert len(data["consistency"]) >= 1
    assert data["consistency"][0]["round_type"] == "WA 18m"
    assert data["consistency"][0]["cv"] >= 0  # CV should be positive
    assert data["consistency"][0]["session_count"] == 5


def test_within_end_analysis(client: TestClient):
    """Test within-end shot position analysis."""
    # Create session with 3 ends, each with 3 shots
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Within-end test"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Pattern: first shot consistently worse
    for end_num in range(1, 4):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 7, "is_x": False, "x": 3.0, "y": 2.0},    # Position 1: worse
                {"score": 9, "is_x": False, "x": 1.0, "y": 0.5},    # Position 2: better
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.3}    # Position 3: better
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Query within-end endpoint
    response = client.get("/api/analytics/within-end")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure
    assert len(data["positions"]) == 3  # 3 positions per end
    assert data["positions"][0]["position"] == 1
    assert data["positions"][1]["position"] == 2
    assert data["positions"][2]["position"] == 3
    
    # Verify counts
    assert data["positions"][0]["count"] == 3  # 3 ends x position 1
    assert data["positions"][1]["count"] == 3
    assert data["positions"][2]["count"] == 3
    
    # Verify best/worst
    assert data["worst_position"] == 1  # First shot is worst
    assert data["best_position"] in [2, 3]  # Second or third is best
    assert data["total_ends"] == 3
    assert data["arrows_per_end_mode"] == 3
    assert "interpretation" in data


def test_hit_probability_endpoint(client: TestClient):
    """Test hit probability calculation."""
    # Create session with shots
    session_data = {
        "round_type": "WA 18m",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Hit probability test"
    }
    session_response = client.post("/api/sessions", json=session_data)
    session_id = session_response.json()["id"]
    
    # Add shots with moderate grouping
    for end_num in range(1, 3):
        end_data = {
            "end_number": end_num,
            "shots": [
                {"score": 10, "is_x": True, "x": 0.5, "y": 0.3},
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.8},
                {"score": 9, "is_x": False, "x": 1.5, "y": 0.9},
                {"score": 8, "is_x": False, "x": 2.1, "y": 1.5},
                {"score": 8, "is_x": False, "x": 2.3, "y": -1.2}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Query hit probability endpoint
    response = client.get(
        "/api/analytics/hit-probability",
        params={"round_type": "WA 18m"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure
    assert data["round_type"] == "WA 18m"
    assert data["total_shots"] == 10
    assert data["sigma_x_cm"] > 0
    assert data["sigma_y_cm"] > 0
    assert data["face_size_cm"] == 40
    
    # Ring probabilities
    assert len(data["ring_probs"]) == 11  # Rings 10 down to 0 (miss)
    
    # Probabilities should sum to ~100%
    total_prob = sum(rp["probability"] for rp in data["ring_probs"])
    assert abs(total_prob - 100.0) < 5.0  # Allow some sampling variance
    
    # Expected score should be positive
    assert data["expected_score"] > 0


def test_equipment_comparison_endpoint(client: TestClient):
    """Test equipment comparison between two setups."""
    # Create two bow setups
    bow_a_data = {
        "name": "Bow A",
        "riser_make": "Hoyt",
        "riser_model": "Satori",
        "riser_length_in": 25,
        "limbs_make": "Hoyt",
        "limbs_model": "Grand Prix",
        "limbs_length": "Medium",
        "limbs_marked_poundage": 30,
        "draw_weight_otf": 28,
        "brace_height_in": 8.5,
        "tiller_top_mm": 2,
        "tiller_bottom_mm": 2,
        "tiller_type": "neutral",
        "plunger_spring_tension": 5,
        "plunger_center_shot_mm": 2,
        "nocking_point_height_mm": 10
    }
    bow_a_response = client.post("/api/bows", json=bow_a_data)
    bow_a_id = bow_a_response.json()["id"]
    
    bow_b_data = {
        **bow_a_data,
        "name": "Bow B",
        "limbs_marked_poundage": 32
    }
    bow_b_response = client.post("/api/bows", json=bow_b_data)
    bow_b_id = bow_b_response.json()["id"]
    
    # Create 3 sessions with bow A (higher scores)
    for i in range(3):
        session_data = {
            "round_type": "WA 18m",
            "target_face_size_cm": 40,
            "distance_m": 18,
            "bow_id": bow_a_id,
            "notes": f"Bow A session {i+1}"
        }
        session_response = client.post("/api/sessions", json=session_data)
        session_id = session_response.json()["id"]
        
        end_data = {
            "end_number": 1,
            "shots": [
                {"score": 9, "is_x": False, "x": 1.0, "y": 0.5},
                {"score": 9, "is_x": False, "x": 1.2, "y": -0.3},
                {"score": 9, "is_x": False, "x": 1.1, "y": 0.8}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Create 3 sessions with bow B (lower scores)
    for i in range(3):
        session_data = {
            "round_type": "WA 18m",
            "target_face_size_cm": 40,
            "distance_m": 18,
            "bow_id": bow_b_id,
            "notes": f"Bow B session {i+1}"
        }
        session_response = client.post("/api/sessions", json=session_data)
        session_id = session_response.json()["id"]
        
        end_data = {
            "end_number": 1,
            "shots": [
                {"score": 7, "is_x": False, "x": 2.5, "y": 1.8},
                {"score": 7, "is_x": False, "x": 2.8, "y": -1.5},
                {"score": 8, "is_x": False, "x": 2.2, "y": 1.2}
            ]
        }
        client.post(f"/api/sessions/{session_id}/ends", json=end_data)
    
    # Query equipment comparison endpoint
    response = client.get(
        "/api/analytics/equipment-comparison",
        params={
            "setup_a_bow_id": bow_a_id,
            "setup_b_bow_id": bow_b_id,
            "round_type": "WA 18m"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure (names are auto-generated from bow specs)
    assert "Hoyt" in data["setup_a"]  # Should contain riser make
    assert "Hoyt" in data["setup_b"]
    assert data["setup_a_sessions"] == 3
    assert data["setup_b_sessions"] == 3
    
    # Score comparison
    assert "score_diff" in data
    assert "score_p_value" in data
    assert "score_cohens_d" in data
    assert data["score_diff"] > 0  # Bow A should score higher
    
    # Sigma comparison
    assert "sigma_diff" in data
    assert "sigma_p_value" in data
    
    # Interpretation
    assert "score_significant" in data
    assert "sigma_significant" in data
    assert "interpretation" in data


def test_dashboard_stats(client: TestClient):
    """Test dashboard statistics endpoint."""
    # Create multiple sessions to test all dashboard features
    
    # Session 1 (oldest)
    session1_data = {
        "round_type": "WA 18m Indoor",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "First session"
    }
    session1_response = client.post("/api/sessions", json=session1_data)
    session1_id = session1_response.json()["id"]
    
    # Add end with 3 shots (total: 27)
    end1_data = {
        "end_number": 1,
        "shots": [
            {"score": 10, "is_x": True, "x": 0.3, "y": 0.2},
            {"score": 9, "is_x": False, "x": 1.2, "y": -0.8},
            {"score": 8, "is_x": False, "x": 2.0, "y": 1.5}
        ]
    }
    client.post(f"/api/sessions/{session1_id}/ends", json=end1_data)
    
    # Session 2 (middle) - personal best
    session2_data = {
        "round_type": "WA 18m Indoor",
        "target_face_size_cm": 40,
        "distance_m": 18,
        "notes": "Best session"
    }
    session2_response = client.post("/api/sessions", json=session2_data)
    session2_id = session2_response.json()["id"]
    
    # Add end with 3 shots (total: 30 - all 10s)
    end2_data = {
        "end_number": 1,
        "shots": [
            {"score": 10, "is_x": True, "x": 0.1, "y": 0.1},
            {"score": 10, "is_x": True, "x": 0.2, "y": -0.1},
            {"score": 10, "is_x": True, "x": 0.0, "y": 0.2}
        ]
    }
    client.post(f"/api/sessions/{session2_id}/ends", json=end2_data)
    
    # Session 3 (most recent)
    session3_data = {
        "round_type": "Flint 20yd",
        "target_face_size_cm": 60,
        "distance_m": 18.28,
        "notes": "Latest session"
    }
    session3_response = client.post("/api/sessions", json=session3_data)
    session3_id = session3_response.json()["id"]
    
    # Add end with 6 shots (total: 48)
    end3_data = {
        "end_number": 1,
        "shots": [
            {"score": 9, "is_x": False, "x": 1.5, "y": 0.8},
            {"score": 8, "is_x": False, "x": 2.1, "y": 1.2},
            {"score": 8, "is_x": False, "x": 1.8, "y": -1.5},
            {"score": 8, "is_x": False, "x": 2.3, "y": 1.0},
            {"score": 8, "is_x": False, "x": 1.9, "y": -1.2},
            {"score": 7, "is_x": False, "x": 3.0, "y": 1.8}
        ]
    }
    client.post(f"/api/sessions/{session3_id}/ends", json=end3_data)
    
    # Query dashboard endpoint
    response = client.get("/api/analytics/dashboard")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify all required fields are present
    assert data["total_sessions"] == 3
    assert data["total_arrows"] == 12  # 3 + 3 + 6
    assert data["days_since_last_practice"] is not None
    assert isinstance(data["days_since_last_practice"], int)
    
    # Last session details (should be session 3)
    assert data["last_session_score"] == 48
    assert data["last_session_round"] == "Flint 20yd"
    assert data["last_session_date"] is not None
    
    # Personal best (should be session 3 with 48 points - highest total score)
    assert data["personal_best_score"] == 48
    assert data["personal_best_round"] == "Flint 20yd"
    assert data["personal_best_date"] is not None
    
    # Rolling average score (EWMA)
    assert data["rolling_avg_score"] is not None
    assert isinstance(data["rolling_avg_score"], float)
    assert 8.0 <= data["rolling_avg_score"] <= 10.0
    
    # Sparkline data (should have 3 sessions in chronological order)
    assert len(data["sparkline_dates"]) == 3
    assert len(data["sparkline_scores"]) == 3
    assert all(isinstance(score, float) for score in data["sparkline_scores"])
    # First session avg: 27/3 = 9.0
    assert abs(data["sparkline_scores"][0] - 9.0) < 0.01
    # Second session avg: 30/3 = 10.0
    assert abs(data["sparkline_scores"][1] - 10.0) < 0.01
    # Third session avg: 48/6 = 8.0
    assert abs(data["sparkline_scores"][2] - 8.0) < 0.01


def test_dashboard_stats_empty_database(client: TestClient):
    """Test dashboard endpoint with no sessions."""
    response = client.get("/api/analytics/dashboard")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify all fields handle empty state gracefully
    assert data["total_sessions"] == 0
    assert data["total_arrows"] == 0
    assert data["days_since_last_practice"] is None
    assert data["last_session_score"] is None
    assert data["last_session_round"] is None
    assert data["last_session_date"] is None
    assert data["rolling_avg_score"] is None
    assert data["personal_best_score"] is None
    assert data["personal_best_round"] is None
    assert data["personal_best_date"] is None
    assert data["sparkline_dates"] == []
    assert data["sparkline_scores"] == []
