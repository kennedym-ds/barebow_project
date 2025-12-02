import numpy as np
from typing import List, Tuple

def calculate_crawl_regression(known_distances: List[float], known_crawls: List[float]) -> np.poly1d:
    """
    Calculates a polynomial regression model (Degree 2) for crawl prediction.
    
    Physics Note:
    The relationship between Distance and Crawl is roughly parabolic (projectile motion).
    Crawl decreases as distance increases, usually hitting 0 (Point On) at ~50m.
    
    Args:
        known_distances: List of distances in meters (e.g., [10, 30, 50])
        known_crawls: List of crawls in mm or stitches (e.g., [25, 10, 0])
        
    Returns:
        A numpy poly1d object that can be called like a function: model(distance) -> crawl
    """
    if len(known_distances) < 3:
        # If we have fewer than 3 points, use linear interpolation (Degree 1)
        degree = 1 if len(known_distances) > 1 else 0
    else:
        degree = 2
        
    # Fit the model
    coefficients = np.polyfit(known_distances, known_crawls, degree)
    model = np.poly1d(coefficients)
    
    return model

def predict_crawl(model: np.poly1d, distance: float) -> float:
    """
    Predicts the crawl for a specific distance using the model.
    """
    prediction = model(distance)
    # Crawls generally shouldn't be negative (aiming above the arrow is rare/illegal in some styles)
    # But for "Gap Shooting" it might be relevant. For String Walking, let's clamp to 0 minimum for now?
    # Actually, let's allow negative to indicate "Aim Above" or "Gap Up" if the user wants.
    return float(prediction)

def generate_crawl_chart(model: np.poly1d, min_dist: int = 5, max_dist: int = 60, step: int = 5) -> List[Tuple[int, float]]:
    """
    Generates a lookup table for the user.
    """
    chart = []
    for d in range(min_dist, max_dist + 1, step):
        crawl = predict_crawl(model, d)
        chart.append((d, round(crawl, 1)))
    return chart
