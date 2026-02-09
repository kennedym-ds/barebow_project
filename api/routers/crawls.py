"""Crawl regression endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Tuple
from src.crawls import calculate_crawl_regression, predict_crawl, generate_crawl_chart

router = APIRouter()


class CrawlCalculateRequest(BaseModel):
    """Request schema for crawl calculation."""
    known_distances: List[float]
    known_crawls: List[float]
    min_dist: int = 5
    max_dist: int = 60
    step: int = 5


class CrawlPoint(BaseModel):
    """A single point on the crawl chart."""
    distance: int
    crawl_mm: float


class CrawlCalculateResponse(BaseModel):
    """Response schema for crawl calculation."""
    chart: List[CrawlPoint]
    coefficients: List[float]


class CrawlPredictRequest(BaseModel):
    """Request schema for crawl prediction."""
    known_distances: List[float]
    known_crawls: List[float]
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
    # Calculate regression model
    model = calculate_crawl_regression(request.known_distances, request.known_crawls)
    
    # Generate chart
    chart_data = generate_crawl_chart(model, request.min_dist, request.max_dist, request.step)
    
    # Convert to response format
    chart = [CrawlPoint(distance=d, crawl_mm=c) for d, c in chart_data]
    
    return CrawlCalculateResponse(
        chart=chart,
        coefficients=model.coefficients.tolist()
    )


@router.post("/predict", response_model=CrawlPredictResponse)
def predict_crawl_position(request: CrawlPredictRequest) -> CrawlPredictResponse:
    """
    Predict crawl position for a specific distance.
    
    Uses the regression model trained on known distances/crawls.
    """
    # Calculate regression model
    model = calculate_crawl_regression(request.known_distances, request.known_crawls)
    
    # Predict for target distance
    crawl_mm = predict_crawl(model, request.target_distance)
    
    return CrawlPredictResponse(
        distance=request.target_distance,
        crawl_mm=round(crawl_mm, 1)
    )
