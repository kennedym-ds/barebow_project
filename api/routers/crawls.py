"""Crawl regression endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.crawls import calculate_crawl_regression, find_point_on_distance, generate_crawl_chart, predict_crawl

router = APIRouter()


def _validate_crawl_lists(distances: list[float], crawls: list[float]) -> None:
    """Shared validation for crawl distance/crawl lists."""
    if len(distances) < 2:
        raise HTTPException(status_code=422, detail="At least 2 data points are required")
    if len(distances) != len(crawls):
        raise HTTPException(status_code=422, detail="known_distances and known_crawls must be the same length")


class CrawlCalculateRequest(BaseModel):
    """Request schema for crawl calculation."""

    known_distances: list[float]
    known_crawls: list[float]
    min_dist: int = 5
    max_dist: int = 60
    step: int = 5


class CrawlPoint(BaseModel):
    """A single point on the crawl chart."""

    distance: int
    crawl_mm: float


class CrawlCalculateResponse(BaseModel):
    """Response schema for crawl calculation."""

    chart: list[CrawlPoint]
    coefficients: list[float]
    point_on_distance: float | None = None


class CrawlPredictRequest(BaseModel):
    """Request schema for crawl prediction."""

    known_distances: list[float]
    known_crawls: list[float]
    target_distance: float


class CrawlPredictResponse(BaseModel):
    """Response schema for crawl prediction."""

    distance: float
    crawl_mm: float


@router.post("/calculate", response_model=CrawlCalculateResponse)
def calculate_crawl(request: CrawlCalculateRequest) -> CrawlCalculateResponse:
    """
    Calculate crawl regression model and generate lookup chart.

    Uses polynomial regression (degree 2) to model the relationship
    between distance and crawl position.
    """
    # Validate inputs
    _validate_crawl_lists(request.known_distances, request.known_crawls)

    # Calculate regression model
    model = calculate_crawl_regression(request.known_distances, request.known_crawls)
    chart_data = generate_crawl_chart(model, request.min_dist, request.max_dist, request.step)

    # Convert to response format
    chart = [CrawlPoint(distance=d, crawl_mm=c) for d, c in chart_data]

    # Find point-on distance
    point_on = find_point_on_distance(model)

    return CrawlCalculateResponse(chart=chart, coefficients=model.coefficients.tolist(), point_on_distance=point_on)


@router.post("/predict", response_model=CrawlPredictResponse)
def predict_crawl_position(request: CrawlPredictRequest) -> CrawlPredictResponse:
    """
    Predict crawl position for a specific distance.

    Uses the regression model trained on known distances/crawls.
    """
    # Validate inputs
    _validate_crawl_lists(request.known_distances, request.known_crawls)

    # Calculate regression model
    model = calculate_crawl_regression(request.known_distances, request.known_crawls)

    # Predict for target distance
    crawl_mm = predict_crawl(model, request.target_distance)

    return CrawlPredictResponse(distance=request.target_distance, crawl_mm=round(crawl_mm, 1))
