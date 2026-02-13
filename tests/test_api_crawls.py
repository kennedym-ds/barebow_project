"""Tests for Crawl Regression endpoints."""

from fastapi.testclient import TestClient

KNOWN_DISTANCES = [10, 18, 30, 50]
KNOWN_CRAWLS = [20.0, 14.0, 8.0, 2.0]


def test_calculate_crawl(client: TestClient):
    response = client.post(
        "/api/crawls/calculate",
        json={
            "known_distances": KNOWN_DISTANCES,
            "known_crawls": KNOWN_CRAWLS,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "chart" in data
    assert len(data["chart"]) > 0
    assert "coefficients" in data


def test_calculate_crawl_too_few_points(client: TestClient):
    response = client.post(
        "/api/crawls/calculate",
        json={
            "known_distances": [10],
            "known_crawls": [20.0],
        },
    )
    assert response.status_code == 422


def test_calculate_crawl_mismatched_lengths(client: TestClient):
    response = client.post(
        "/api/crawls/calculate",
        json={
            "known_distances": [10, 20, 30],
            "known_crawls": [20.0, 14.0],
        },
    )
    assert response.status_code == 422


def test_predict_crawl(client: TestClient):
    response = client.post(
        "/api/crawls/predict",
        json={
            "known_distances": KNOWN_DISTANCES,
            "known_crawls": KNOWN_CRAWLS,
            "target_distance": 25,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["distance"] == 25
    assert "crawl_mm" in data


def test_predict_crawl_too_few_points(client: TestClient):
    response = client.post(
        "/api/crawls/predict",
        json={
            "known_distances": [10],
            "known_crawls": [20.0],
            "target_distance": 25,
        },
    )
    assert response.status_code == 422
