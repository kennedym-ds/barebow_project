"""Physics and analysis endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session as SQLModelSession

from api.deps import get_db
from src.analysis import VirtualCoach
from src.models import ArrowSetup, BowSetup
from src.park_model import predict_score_at_distance
from src.physics import analyze_setup_safety, score_setup_efficiency

router = APIRouter()


class VirtualCoachRequest(BaseModel):
    """Request schema for virtual coach analysis."""

    bow_id: str
    arrow_id: str
    short_score: float
    short_distance_m: float
    short_face_cm: int
    long_score: float
    long_distance_m: float
    long_face_cm: int


class PredictScoreRequest(BaseModel):
    """Request schema for score prediction."""

    known_score: float
    known_distance_m: float
    known_face_cm: int
    target_distance_m: float
    target_face_cm: int


class SetupEfficiencyRequest(BaseModel):
    """Request schema for setup efficiency scoring."""

    bow_id: str
    arrow_id: str
    discipline: str = "indoor"  # indoor or outdoor


class SafetyCheckRequest(BaseModel):
    """Request schema for safety check."""

    bow_id: str
    arrow_id: str


@router.post("/virtual-coach")
def analyze_performance(request: VirtualCoachRequest, db: SQLModelSession = Depends(get_db)) -> dict[str, Any]:
    """
    Run virtual coach analysis on session performance.

    Analyzes equipment safety, setup efficiency, and performance metrics
    to provide actionable recommendations.
    """
    # Fetch bow and arrow
    bow = db.get(BowSetup, request.bow_id)
    if not bow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow setup not found")

    arrow = db.get(ArrowSetup, request.arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")

    # Run analysis
    coach = VirtualCoach(bow, arrow)
    results = coach.analyze_session_performance(
        short_score=request.short_score,
        short_dist=request.short_distance_m,
        short_face=request.short_face_cm,
        long_score=request.long_score,
        long_dist=request.long_distance_m,
        long_face=request.long_face_cm,
    )

    return results


@router.post("/predict-score")
def predict_score(request: PredictScoreRequest) -> dict[str, Any]:
    """
    Predict score at a target distance based on known performance.

    Uses angular error modeling to project skill to different distances.
    """
    predicted_score, predicted_sigma = predict_score_at_distance(
        known_score=request.known_score,
        known_distance_m=request.known_distance_m,
        known_face_cm=request.known_face_cm,
        target_distance_m=request.target_distance_m,
        target_face_cm=request.target_face_cm,
    )

    return {"predicted_score": round(predicted_score, 2), "predicted_sigma": round(predicted_sigma, 2)}


@router.post("/setup-efficiency")
def check_setup_efficiency(request: SetupEfficiencyRequest, db: SQLModelSession = Depends(get_db)) -> dict[str, Any]:
    """
    Score setup efficiency based on discipline (indoor/outdoor).

    Evaluates GPP, arrow diameter, and other factors against best practices.
    """
    # Fetch bow and arrow
    bow = db.get(BowSetup, request.bow_id)
    if not bow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow setup not found")

    arrow = db.get(ArrowSetup, request.arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")

    # Run analysis
    results = score_setup_efficiency(bow, arrow, request.discipline)

    return results


@router.post("/safety-check")
def check_safety(request: SafetyCheckRequest, db: SQLModelSession = Depends(get_db)) -> dict[str, list[str]]:
    """
    Check equipment setup for safety issues.

    Returns warnings about potentially dangerous configurations (e.g., low GPP).
    """
    # Fetch bow and arrow
    bow = db.get(BowSetup, request.bow_id)
    if not bow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow setup not found")

    arrow = db.get(ArrowSetup, request.arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")

    # Run safety check
    warnings = analyze_setup_safety(bow, arrow)

    return {"warnings": warnings}
