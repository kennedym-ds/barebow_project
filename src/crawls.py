import numpy as np


def calculate_crawl_regression(known_distances: list[float], known_crawls: list[float]) -> np.poly1d:
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


def generate_crawl_chart(
    model: np.poly1d, min_dist: int = 5, max_dist: int = 60, step: int = 5
) -> list[tuple[int, float]]:
    """
    Generates a lookup table for the user.
    """
    chart = []
    for d in range(min_dist, max_dist + 1, step):
        crawl = predict_crawl(model, d)
        chart.append((d, round(crawl, 1)))
    return chart


def find_point_on_distance(model: np.poly1d) -> float | None:
    """
    Finds the Point-On distance — where crawl equals zero.

    Point-On is the distance at which the archer aims directly at the target
    with no string walk (crawl = 0). This is the 'Rosetta Stone' of barebow
    string-walking — all other crawl values are referenced against it.

    Args:
        model: The polynomial regression model from calculate_crawl_regression

    Returns:
        The Point-On distance in meters, or None if no valid root exists.
        Returns the smallest positive real root within a reasonable range (5-100m).
    """
    roots = np.roots(model.coefficients)

    # Filter to real, positive roots in a reasonable range
    valid_roots = []
    for root in roots:
        if np.isreal(root):
            real_val = float(np.real(root))
            if 5.0 <= real_val <= 100.0:
                valid_roots.append(real_val)

    if not valid_roots:
        return None

    # Return the smallest valid root (typically the point-on distance)
    return round(min(valid_roots), 1)
