import math
from typing import Tuple

# Constants for Target Faces (Radius in cm)
# WA Target Faces: 122cm, 80cm, 60cm, 40cm
# Ring width is Face Diameter / 10 / 2 = Diameter / 20
def get_ring_radii(face_diameter_cm: int) -> list[float]:
    """Returns the outer radius of each scoring ring (10 down to 1) in cm."""
    ring_width = face_diameter_cm / 20.0
    # Inner 10 (X-ring) is half the size of the 10 ring usually, but for standard scoring
    # we often just treat the 10 ring as the full 10 zone.
    # For compound, the 10 is smaller (half size). For Recurve/Barebow, 10 is full size.
    # Let's assume standard Recurve/Barebow 10-ring.
    
    radii = []
    for i in range(1, 11): # 1 to 10 rings (actually we need 10 down to 1)
        # The 10 ring is the center. Its outer edge is 1 * ring_width.
        # The 1 ring is the outermost. Its outer edge is 10 * ring_width.
        # We need the boundaries.
        # Ring 10 outer radius = 1 * ring_width
        # Ring 9 outer radius = 2 * ring_width
        radii.append(i * ring_width)
    return radii

def calculate_expected_score(sigma_r: float, face_diameter_cm: int) -> float:
    """
    Calculates the expected average arrow score for a given radial standard deviation (sigma_r).
    Formula: Average Score = 10 - Sum(exp(-R_i^2 / (2*sigma^2)))
    """
    if sigma_r <= 0:
        return 10.0
        
    radii = get_ring_radii(face_diameter_cm)
    # radii[0] is the 10-ring outer edge (smallest)
    # radii[9] is the 1-ring outer edge (largest)
    
    # The formula usually sums the probability of MISSING each ring.
    # Score = 10 - P(outside 10) - P(outside 9) - ... - P(outside 1)
    # P(outside radius R) = exp(-R^2 / (2*sigma^2)) for Rayleigh distribution of radius
    
    score_loss = 0.0
    for r in radii:
        prob_outside = math.exp(-(r**2) / (2 * (sigma_r**2)))
        score_loss += prob_outside
        
    return 10.0 - score_loss

def calculate_sigma_from_score(score: float, face_diameter_cm: int, tolerance: float = 0.001) -> float:
    """
    Reverse solves the expected score formula to find the sigma_r (group size) 
    that produces the given average arrow score (0-10).
    Uses Binary Search.
    """
    if score >= 10:
        return 0.0
    if score <= 0:
        return 1000.0 # Massive spread
        
    low = 0.0
    high = 200.0 # 2 meters standard deviation is huge, safe upper bound
    
    for _ in range(50): # 50 iterations is plenty for precision
        mid = (low + high) / 2
        predicted = calculate_expected_score(mid, face_diameter_cm)
        
        if abs(predicted - score) < tolerance:
            return mid
            
        if predicted > score:
            # We are shooting too well, need more spread (higher sigma)
            low = mid
        else:
            # We are shooting too poorly, need less spread (lower sigma)
            high = mid
            
    return (low + high) / 2

def predict_score_at_distance(
    known_score: float, 
    known_distance_m: float, 
    known_face_cm: int, 
    target_distance_m: float, 
    target_face_cm: int
) -> Tuple[float, float]:
    """
    Predicts the score at a new distance based on the skill demonstrated at a known distance.
    Returns (Predicted Score, Predicted Sigma_R at new distance).
    """
    # 1. Calculate Sigma at known distance
    sigma_known = calculate_sigma_from_score(known_score, known_face_cm)
    
    # 2. Calculate Angular Error (Sigma_Theta) in radians
    # sigma_r approx distance * sigma_theta
    # So sigma_theta = sigma_r / (distance * 100)  <- convert m to cm
    sigma_theta = sigma_known / (known_distance_m * 100.0)
    
    # 3. Project to new distance
    # New Sigma = Sigma_Theta * (New Distance * 100)
    sigma_new = sigma_theta * (target_distance_m * 100.0)
    
    # 4. Calculate new score
    predicted_score = calculate_expected_score(sigma_new, target_face_cm)
    
    return predicted_score, sigma_new

def calculate_drag_loss(
    short_score: float, 
    short_dist_m: float, 
    short_face_cm: int,
    long_score: float,
    long_dist_m: float,
    long_face_cm: int
) -> dict:
    """
    Quantifies how many points are lost due to non-linear factors (drag, drift, tuning)
    by comparing actual long distance score to the predicted score from short distance skill.
    """
    predicted_long, _ = predict_score_at_distance(
        short_score, short_dist_m, short_face_cm, long_dist_m, long_face_cm
    )
    
    loss = predicted_long - long_score
    
    return {
        "predicted_score": round(predicted_long, 2),
        "actual_score": round(long_score, 2),
        "points_lost": round(loss, 2),
        "percent_loss": round((loss / predicted_long) * 100, 1) if predicted_long > 0 else 0
    }
