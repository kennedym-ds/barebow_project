from datetime import datetime
from typing import List, Optional

import numpy as np
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import selectinload
from sqlmodel import Session as SQLModelSession, select

from api.deps import get_db
from src.models import End, Session as SessionModel
from src.park_model import calculate_sigma_from_score
from src.rounds import get_round_preset

from ._schemas import DashboardStats, PersonalBest, SessionScoreContext, SessionSummaryStats, ShotDetail
from ._shared import _parse_date

router = APIRouter()


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
        start = _parse_date(from_date)
        statement = statement.where(SessionModel.date >= start)

    if to_date:
        end = _parse_date(to_date)
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
        start = _parse_date(from_date)
        statement = statement.where(SessionModel.date >= start)

    if to_date:
        end = _parse_date(to_date)
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


@router.get("/score-context", response_model=List[SessionScoreContext])
def get_score_context(
    round_type: Optional[str] = Query(None, description="Comma-separated round types to filter"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Get session summaries with round context (max score, percentage, completion status).

    Adds round preset information to show how close the archer is to a perfect score.
    """
    # Build query (reuse pattern from summary endpoint)
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots)
    ).order_by(SessionModel.date.desc())

    # Apply filters
    if round_type:
        round_types = [rt.strip() for rt in round_type.split(",")]
        statement = statement.where(SessionModel.round_type.in_(round_types))

    if from_date:
        start = _parse_date(from_date)
        statement = statement.where(SessionModel.date >= start)

    if to_date:
        end = _parse_date(to_date)
        statement = statement.where(SessionModel.date <= end)

    sessions = db.exec(statement).all()

    # Calculate context for each session
    results = []
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

        # Get round preset
        preset = get_round_preset(session.round_type)

        # Calculate max score and round completion
        if preset:
            max_score = preset.max_score
            preset_arrow_count = preset.arrow_count
            round_complete = shot_count >= preset_arrow_count
        else:
            # Fallback for unknown rounds
            max_score = shot_count * 10
            preset_arrow_count = None
            round_complete = False

        # Calculate percentage
        score_percentage = (total_score / max_score * 100.0) if max_score > 0 else 0.0

        # Calculate avg score and sigma
        avg_score = total_score / shot_count if shot_count > 0 else 0.0
        sigma_cm = calculate_sigma_from_score(avg_score, session.target_face_size_cm) if shot_count > 0 else 0.0

        # Calculate CEP 50
        if shot_count > 1:
            r_dists = [np.sqrt(x**2 + y**2) for x, y in zip(shots_x, shots_y)]
            cep_50 = float(np.percentile(r_dists, 50))
        else:
            cep_50 = 0.0

        results.append(SessionScoreContext(
            session_id=session.id,
            date=session.date,
            round_type=session.round_type,
            distance_m=session.distance_m,
            total_score=total_score,
            shot_count=shot_count,
            avg_score=round(avg_score, 2),
            max_score=max_score,
            score_percentage=round(score_percentage, 1),
            sigma_cm=round(sigma_cm, 2),
            cep_50=round(cep_50, 2),
            preset_arrow_count=preset_arrow_count,
            round_complete=round_complete
        ))

    return results


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(db: SQLModelSession = Depends(get_db)):
    """
    Get dashboard summary statistics.

    Provides high-level metrics for dashboard home page including:
    - Total sessions and arrows shot
    - Last session details and recency
    - Rolling average score (EWMA with span=10)
    - Personal best score and date
    - Sparkline data (last 20 sessions)
    """
    # Load all sessions with eager loading
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots)
    ).order_by(SessionModel.date.desc())

    sessions = db.exec(statement).all()

    # Handle empty database
    if not sessions:
        return DashboardStats(
            total_sessions=0,
            total_arrows=0,
            days_since_last_practice=None,
            last_session_score=None,
            last_session_round=None,
            last_session_date=None,
            rolling_avg_score=None,
            personal_best_score=None,
            personal_best_round=None,
            personal_best_date=None,
            sparkline_dates=[],
            sparkline_scores=[]
        )

    # Calculate total arrows across all sessions
    total_arrows = 0
    session_stats = []  # (session, total_score, shot_count, avg_arrow_score)

    for session in sessions:
        total_score = 0
        shot_count = 0

        for end in session.ends:
            for shot in end.shots:
                total_score += shot.score
                shot_count += 1
                total_arrows += 1

        avg_arrow_score = total_score / shot_count if shot_count > 0 else 0.0
        session_stats.append((session, total_score, shot_count, avg_arrow_score))

    # Last session details
    last_session, last_total_score, last_shot_count, _ = session_stats[0]
    days_since_last = (datetime.now() - last_session.date).days

    # Personal best (max total score)
    best_session, best_score, best_shot_count, _ = max(session_stats, key=lambda x: x[1])

    # Rolling average score (EWMA with span=10)
    # EWMA formula: alpha = 2 / (span + 1) = 2 / 11 ≈ 0.1818
    rolling_avg = None
    if session_stats:
        alpha = 2.0 / (10 + 1)
        # Process sessions in chronological order for EWMA
        reversed_stats = list(reversed(session_stats))
        ewma = reversed_stats[0][3]  # Start with first avg_arrow_score

        for i in range(1, len(reversed_stats)):
            current_avg = reversed_stats[i][3]
            ewma = alpha * current_avg + (1 - alpha) * ewma

        rolling_avg = ewma

    # Sparkline: last 20 sessions in chronological order
    sparkline_sessions = session_stats[:20]  # Take last 20 (most recent)
    sparkline_sessions = list(reversed(sparkline_sessions))  # Reverse to chronological order

    sparkline_dates = [s[0].date.isoformat() for s in sparkline_sessions]
    sparkline_scores = [s[3] for s in sparkline_sessions]  # avg_arrow_score

    return DashboardStats(
        total_sessions=len(sessions),
        total_arrows=total_arrows,
        days_since_last_practice=days_since_last,
        last_session_score=last_total_score,
        last_session_round=last_session.round_type,
        last_session_date=last_session.date.isoformat(),
        rolling_avg_score=rolling_avg,
        personal_best_score=best_score,
        personal_best_round=best_session.round_type,
        personal_best_date=best_session.date.isoformat(),
        sparkline_dates=sparkline_dates,
        sparkline_scores=sparkline_scores
    )
