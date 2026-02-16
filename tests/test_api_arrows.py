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


# ---------------------------------------------------------------------------
# Analytics endpoint
# ---------------------------------------------------------------------------


def test_arrow_analytics(client: TestClient):
    """Analytics returns grades, group stats, and outliers for shaft data."""
    created = client.post("/api/arrows", json=ARROW_DATA).json()
    arrow_id = created["id"]

    shafts = [
        {"arrow_number": 1, "measured_weight_gr": 350.0, "measured_spine_astm": 570, "straightness": 0.001},
        {"arrow_number": 2, "measured_weight_gr": 350.3, "measured_spine_astm": 571, "straightness": 0.002},
        {"arrow_number": 3, "measured_weight_gr": 350.1, "measured_spine_astm": 569, "straightness": 0.001},
        {"arrow_number": 4, "measured_weight_gr": 349.8, "measured_spine_astm": 570, "straightness": 0.003},
    ]
    client.post(f"/api/arrows/{arrow_id}/shafts", json=shafts)

    resp = client.get(f"/api/arrows/{arrow_id}/analytics")
    assert resp.status_code == 200

    data = resp.json()
    assert len(data["grades"]) == 4
    assert all("grade" in g for g in data["grades"])
    assert data["group_stats"]["shaft_count"] == 4
    assert data["group_stats"]["weight"] is not None
    assert data["group_stats"]["weight"]["mean"] > 0
    assert isinstance(data["outliers"], list)


def test_arrow_analytics_no_shafts(client: TestClient):
    """Analytics with no shafts returns empty grades and null stats."""
    created = client.post("/api/arrows", json=ARROW_DATA).json()
    arrow_id = created["id"]

    resp = client.get(f"/api/arrows/{arrow_id}/analytics")
    assert resp.status_code == 200

    data = resp.json()
    assert data["grades"] == []
    assert data["group_stats"]["shaft_count"] == 0
    assert data["group_stats"]["weight"] is None
    assert data["outliers"] == []


def test_arrow_analytics_not_found(client: TestClient):
    resp = client.get("/api/arrows/nonexistent/analytics")
    assert resp.status_code == 404


def test_arrow_analytics_with_outlier(client: TestClient):
    """An extreme shaft triggers outlier detection."""
    created = client.post("/api/arrows", json=ARROW_DATA).json()
    arrow_id = created["id"]

    shafts = [
        {"arrow_number": i, "measured_weight_gr": 350.0, "measured_spine_astm": 570, "straightness": 0.001}
        for i in range(1, 7)
    ]
    # Shaft 7 is a clear outlier
    shafts.append({"arrow_number": 7, "measured_weight_gr": 370.0, "measured_spine_astm": 570, "straightness": 0.001})
    client.post(f"/api/arrows/{arrow_id}/shafts", json=shafts)

    resp = client.get(f"/api/arrows/{arrow_id}/analytics")
    assert resp.status_code == 200

    data = resp.json()
    weight_outliers = [o for o in data["outliers"] if o["feature"] == "weight"]
    assert any(o["arrow_number"] == 7 for o in weight_outliers)


# ---------------------------------------------------------------------------
# Spine check endpoint
# ---------------------------------------------------------------------------

BOW_DATA = {
    "riser_make": "Hoyt",
    "riser_model": "Satori",
    "riser_length_in": 25,
    "limbs_make": "SF",
    "limbs_model": "Premium Plus",
    "limbs_length": "Medium",
    "limbs_marked_poundage": 36,
    "draw_weight_otf": 40,
    "draw_length_in": 28.0,
    "brace_height_in": 8.5,
    "tiller_top_mm": 3.0,
    "tiller_bottom_mm": 3.5,
    "tiller_type": "neutral",
    "plunger_spring_tension": 12,
    "plunger_center_shot_mm": 1.5,
    "nocking_point_height_mm": 10.0,
}


def test_spine_check(client: TestClient):
    """Spine check returns a match status for bow+arrow combo."""
    arrow = client.post("/api/arrows", json=ARROW_DATA).json()
    bow = client.post("/api/bows", json=BOW_DATA).json()

    resp = client.get(f"/api/arrows/{arrow['id']}/spine-check", params={"bow_id": bow["id"]})
    assert resp.status_code == 200

    data = resp.json()
    assert data["status"] in ("matched", "slightly_stiff", "slightly_weak", "too_stiff", "too_weak")
    assert "message" in data
    assert data["recommended_spine"] > 0
    assert data["effective_draw_weight"] > 0
    # Arrow has total_arrow_weight_gr and shaft_diameter_mm → frequency match included
    assert data["frequency_match"] is not None
    fm = data["frequency_match"]
    assert fm["match_quality"] in ("excellent", "good", "too_stiff", "too_weak")
    assert fm["arrow_frequency_hz"] > 0


def test_spine_check_effective_draw_weight(client: TestClient):
    """Spine check returns effective_draw_weight based on bow corrections."""
    arrow = client.post("/api/arrows", json=ARROW_DATA).json()
    bow = client.post("/api/bows", json=BOW_DATA).json()

    resp = client.get(f"/api/arrows/{arrow['id']}/spine-check", params={"bow_id": bow["id"]})
    data = resp.json()
    # Effective draw weight accounts for brace height + string corrections
    assert data["effective_draw_weight"] > 0
    assert data["effective_draw_weight"] != data["recommended_spine"]


def test_spine_check_not_found(client: TestClient):
    resp = client.get("/api/arrows/nonexistent/spine-check", params={"bow_id": "fake"})
    assert resp.status_code == 404


def test_spine_check_no_draw_length(client: TestClient):
    """Bow without draw_length_in → 422."""
    arrow = client.post("/api/arrows", json=ARROW_DATA).json()
    bow_no_dl = {**BOW_DATA, "draw_length_in": None}
    bow = client.post("/api/bows", json=bow_no_dl).json()

    resp = client.get(f"/api/arrows/{arrow['id']}/spine-check", params={"bow_id": bow["id"]})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Optimize endpoint
# ---------------------------------------------------------------------------


def test_optimize_arrow_set(client: TestClient):
    """Optimizer returns ranked sets when enough shafts exist."""
    created = client.post("/api/arrows", json=ARROW_DATA).json()
    arrow_id = created["id"]

    shafts = [
        {"arrow_number": i, "measured_weight_gr": 350.0 + (i * 0.3), "measured_spine_astm": 570, "straightness": 0.001}
        for i in range(1, 13)
    ]
    client.post(f"/api/arrows/{arrow_id}/shafts", json=shafts)

    resp = client.post(f"/api/arrows/{arrow_id}/optimize", json={"set_size": 6, "top_n": 3})
    assert resp.status_code == 200

    data = resp.json()
    assert len(data) == 3
    assert data[0]["rank"] == 1
    assert len(data[0]["arrow_numbers"]) == 6
    # Best set should have lowest consistency score
    assert data[0]["consistency_score"] <= data[1]["consistency_score"]


def test_optimize_insufficient_shafts(client: TestClient):
    """Fewer shafts than set_size → 422."""
    created = client.post("/api/arrows", json=ARROW_DATA).json()
    arrow_id = created["id"]

    shafts = [{"arrow_number": i, "measured_weight_gr": 350.0} for i in range(1, 4)]
    client.post(f"/api/arrows/{arrow_id}/shafts", json=shafts)

    resp = client.post(f"/api/arrows/{arrow_id}/optimize", json={"set_size": 6})
    assert resp.status_code == 422


def test_optimize_not_found(client: TestClient):
    resp = client.post("/api/arrows/nonexistent/optimize", json={"set_size": 6})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Find-similar endpoint
# ---------------------------------------------------------------------------


def test_find_similar(client: TestClient):
    """POST find-similar with reference arrows returns ranked results."""
    created = client.post("/api/arrows", json=ARROW_DATA).json()
    arrow_id = created["id"]

    shafts = [
        {"arrow_number": 1, "measured_weight_gr": 350.0, "measured_spine_astm": 570, "straightness": 0.002},
        {"arrow_number": 2, "measured_weight_gr": 350.2, "measured_spine_astm": 571, "straightness": 0.002},
        {"arrow_number": 3, "measured_weight_gr": 355.0, "measured_spine_astm": 580, "straightness": 0.005},
        {"arrow_number": 4, "measured_weight_gr": 349.8, "measured_spine_astm": 569, "straightness": 0.001},
        {"arrow_number": 5, "measured_weight_gr": 360.0, "measured_spine_astm": 590, "straightness": 0.010},
    ]
    client.post(f"/api/arrows/{arrow_id}/shafts", json=shafts)

    resp = client.post(f"/api/arrows/{arrow_id}/find-similar", json={
        "reference_arrow_numbers": [1, 2],
        "top_n": 3,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    # Arrow 4 should be most similar to arrows 1&2 (close weight/spine)
    assert data[0]["arrow_number"] == 4
    assert data[0]["similarity_score"] > data[-1]["similarity_score"]


def test_find_similar_bad_refs(client: TestClient):
    """Reference arrow numbers not in set → 422."""
    created = client.post("/api/arrows", json=ARROW_DATA).json()
    arrow_id = created["id"]

    shafts = [{"arrow_number": 1, "measured_weight_gr": 350.0, "measured_spine_astm": 570, "straightness": 0.002}]
    client.post(f"/api/arrows/{arrow_id}/shafts", json=shafts)

    resp = client.post(f"/api/arrows/{arrow_id}/find-similar", json={
        "reference_arrow_numbers": [99, 100],
    })
    assert resp.status_code == 422


def test_find_similar_not_found(client: TestClient):
    resp = client.post("/api/arrows/nonexistent/find-similar", json={
        "reference_arrow_numbers": [1],
    })
    assert resp.status_code == 404
