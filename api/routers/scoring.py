"""Score calculation endpoints."""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from src.scoring import get_ring_score, get_flint_score
import math

router = APIRouter()


class ScoreResult(BaseModel):
    """Result of a score calculation."""
    score: int
    is_x: bool = False


@router.get("/ring", response_model=ScoreResult)
def calculate_ring_score(
    x: float = Query(..., description="X coordinate on target face (cm)"),
    y: float = Query(..., description="Y coordinate on target face (cm)"),
    face_cm: int = Query(..., description="Face size in cm (e.g., 40, 60, 80, 122)"),
    face_type: str = Query(default="WA", description="Face type: 'WA' or 'Flint'"),
    x_is_11: bool = Query(default=False, description="Whether X ring counts as 11 (compound scoring)")
):
    """
    Calculate score from shot coordinates.
    
    Returns the score and whether it's an X (inner 10).
    """
    # Calculate radius from center
    radius_cm = math.sqrt(x**2 + y**2)
    
    if face_type.upper() == "FLINT":
        score = get_flint_score(radius_cm, face_cm)
        is_x = False  # Flint doesn't have X ring scoring
    else:
        score = get_ring_score(radius_cm, face_cm, x_is_11)
        # Check if it's an X (inner 10)
        ring_width = face_cm / 20.0
        x_radius = ring_width / 2
        is_x = (score >= 10 and radius_cm <= x_radius)
    
    return ScoreResult(score=score, is_x=is_x)
