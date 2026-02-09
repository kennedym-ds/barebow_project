"""Analytics aggregation endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session as SQLModelSession, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from src.models import Session as SessionModel, End, Shot, BowSetup, ArrowSetup
from api.deps import get_db
import numpy as np

router = APIRouter()


class SessionSummaryStats(BaseModel):
    """Session summary with computed statistics."""
    session_id: str
    date: datetime
    round_type: str
    distance_m: float
    face_cm: int
    total_score: int
    shot_count: int
    avg_score: float
    mean_radius: float
    sigma_x: float
    sigma_y: float
    cep_50: float
    bow_name: Optional[str] = None
    arrow_name: Optional[str] = None


class ShotDetail(BaseModel):
    """Individual shot with session context."""
    session_id: str
    session_date: datetime
    round_type: str
    end_number: int
    arrow_number: Optional[int] = None
    score: int
    is_x: bool
    x: float
    y: float
    face_size: int


class PersonalBest(BaseModel):
    """Personal best for a round type."""
    round_type: str
    total_score: int
    avg_score: float
    date: datetime
    session_id: str


@router.get("/summary", response_model=List[SessionSummaryStats])
def get_session_summaries(
    round_type: Optional[str] = Query(None, description="Comma-separated round types to filter"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Get session summaries with computed statistics.
    
    Computes: total_score, shot_count, avg_score, mean_radius, sigma_x, sigma_y, cep_50
    """
    # Build query
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots),
        selectinload(SessionModel.bow),
        selectinload(SessionModel.arrow)
    ).order_by(SessionModel.date.desc())
    
    # Apply filters
    if round_type:
        round_types = [rt.strip() for rt in round_type.split(",")]
        statement = statement.where(SessionModel.round_type.in_(round_types))
    
    if from_date:
        start = datetime.fromisoformat(from_date)
        statement = statement.where(SessionModel.date >= start)
    
    if to_date:
        end = datetime.fromisoformat(to_date)
        statement = statement.where(SessionModel.date <= end)
    
    sessions = db.exec(statement).all()
    
    # Calculate statistics for each session
    summaries = []
    for session in sessions:
        total_score = 0
        shot_count = 0
        shots_x = []
        shots_y = []
        
        for end in session.ends:
            for shot in end.shots:
                total_score += shot.score
                shot_count += 1
                shots_x.append(shot.x)
                shots_y.append(shot.y)
        
        # Calculate group statistics
        if shot_count > 1:
            avg_score = total_score / shot_count
            
            # Mean radius
            r_dists = [np.sqrt(x**2 + y**2) for x, y in zip(shots_x, shots_y)]
            mean_radius = float(np.mean(r_dists))
            
            # Dispersion metrics
            sigma_x = float(np.std(shots_x))
            sigma_y = float(np.std(shots_y))
            cep_50 = float(np.percentile(r_dists, 50))
        else:
            avg_score = float(total_score) if shot_count > 0 else 0.0
            mean_radius = 0.0
            sigma_x = 0.0
            sigma_y = 0.0
            cep_50 = 0.0
        
        summaries.append(SessionSummaryStats(
            session_id=session.id,
            date=session.date,
            round_type=session.round_type,
            distance_m=session.distance_m,
            face_cm=session.target_face_size_cm,
            total_score=total_score,
            shot_count=shot_count,
            avg_score=round(avg_score, 2),
            mean_radius=round(mean_radius, 2),
            sigma_x=round(sigma_x, 2),
            sigma_y=round(sigma_y, 2),
            cep_50=round(cep_50, 2),
            bow_name=session.bow.name if session.bow else None,
            arrow_name=f"{session.arrow.make} {session.arrow.model}" if session.arrow else None
        ))
    
    return summaries


@router.get("/shots", response_model=List[ShotDetail])
def get_all_shots(
    round_type: Optional[str] = Query(None, description="Comma-separated round types to filter"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Get all individual shots with session context.
    
    Useful for arrow consistency analysis and heatmaps.
    """
    # Build query
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots)
    ).order_by(SessionModel.date)
    
    # Apply filters
    if round_type:
        round_types = [rt.strip() for rt in round_type.split(",")]
        statement = statement.where(SessionModel.round_type.in_(round_types))
    
    if from_date:
        start = datetime.fromisoformat(from_date)
        statement = statement.where(SessionModel.date >= start)
    
    if to_date:
        end = datetime.fromisoformat(to_date)
        statement = statement.where(SessionModel.date <= end)
    
    sessions = db.exec(statement).all()
    
    # Collect all shots
    shots = []
    for session in sessions:
        for end in session.ends:
            for shot in end.shots:
                shots.append(ShotDetail(
                    session_id=session.id,
                    session_date=session.date,
                    round_type=session.round_type,
                    end_number=end.end_number,
                    arrow_number=shot.arrow_number,
                    score=shot.score,
                    is_x=shot.is_x,
                    x=shot.x,
                    y=shot.y,
                    face_size=session.target_face_size_cm
                ))
    
    return shots


@router.get("/personal-bests", response_model=List[PersonalBest])
def get_personal_bests(db: SQLModelSession = Depends(get_db)):
    """
    Get personal bests grouped by round type.
    
    Returns the highest scoring session for each round type.
    """
    # Get all sessions with ends and shots
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots)
    ).order_by(SessionModel.date)
    
    sessions = db.exec(statement).all()
    
    # Calculate total scores and group by round type
    round_bests = {}
    
    for session in sessions:
        total_score = 0
        shot_count = 0
        
        for end in session.ends:
            for shot in end.shots:
                total_score += shot.score
                shot_count += 1
        
        avg_score = total_score / shot_count if shot_count > 0 else 0.0
        
        # Check if this is a PB for this round type
        if session.round_type not in round_bests or total_score > round_bests[session.round_type]["total_score"]:
            round_bests[session.round_type] = {
                "round_type": session.round_type,
                "total_score": total_score,
                "avg_score": round(avg_score, 2),
                "date": session.date,
                "session_id": session.id
            }
    
    # Convert to list of PersonalBest objects
    pbs = [PersonalBest(**data) for data in round_bests.values()]
    
    # Sort by total score descending
    pbs.sort(key=lambda x: x.total_score, reverse=True)
    
    return pbs
