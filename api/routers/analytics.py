"""Analytics aggregation endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session as SQLModelSession, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from src.models import Session as SessionModel, End, Shot, BowSetup, ArrowSetup
from src.park_model import calculate_sigma_from_score, predict_score_at_distance
from src.rounds import get_round_preset
from api.deps import get_db
import numpy as np
from src import precision

router = APIRouter()


def _parse_date(value: str) -> datetime:
    """Parse ISO date string, raising 422 on invalid format."""
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail=f"Invalid date format: '{value}'. Expected ISO 8601 (e.g. 2025-01-15)")


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


class ParkModelAnalysis(BaseModel):
    """Cross-distance analysis using James Park Model."""
    short_round: str
    short_avg_score: float  # per-arrow average
    short_session_count: int
    short_sigma_cm: float
    long_round: str
    long_avg_score: float  # per-arrow average
    long_session_count: int
    long_sigma_cm: float
    predicted_long_score: float  # what the Park Model predicts at long distance from short skill
    predicted_long_sigma: float
    drag_loss_points: float  # predicted - actual (per arrow)
    drag_loss_percent: float
    sigma_theta_mrad: float  # angular deviation in milliradians


class SessionScoreContext(BaseModel):
    """Session summary with round context and scoring percentage."""
    session_id: str
    date: datetime
    round_type: str
    distance_m: float
    total_score: int
    shot_count: int
    avg_score: float  # per arrow
    max_score: int  # from round preset or shot_count * 10
    score_percentage: float  # total_score / max_score * 100
    sigma_cm: float  # radial sigma from park model
    cep_50: float
    preset_arrow_count: Optional[int] = None  # expected arrow count from preset
    round_complete: bool  # did they shoot the full round?


class EndScore(BaseModel):
    """End score summary for fatigue analysis."""
    end_number: int
    avg_score: float
    shot_count: int


class BiasAnalysis(BaseModel):
    """Shot pattern bias and fatigue analysis."""
    total_shots: int
    # MPI
    mpi_x_cm: float
    mpi_y_cm: float
    mpi_x_normalized: float  # -1 to 1 range
    mpi_y_normalized: float
    # Directional bias
    bias_direction: str  # "N", "NE", "E", ... or "Center"
    bias_magnitude_cm: float
    bias_magnitude_normalized: float
    # H/V ratio
    sigma_x_cm: float
    sigma_y_cm: float
    hv_ratio: float  # sigma_x / sigma_y
    hv_interpretation: str  # "Horizontal-dominant", "Vertical-dominant", "Balanced"
    # End fatigue
    fatigue_slope: float
    fatigue_correlation: float
    fatigue_interpretation: str  # "No fatigue detected", "Mild fatigue (last ends drop ~X pts)", etc.
    end_scores: List[EndScore]
    # First arrow
    first_arrow_avg: float
    other_arrows_avg: float
    first_arrow_penalty: float
    first_arrow_interpretation: str  # "No first-arrow effect", "Mild first-arrow penalty (-0.3 pts)", etc.


class AdvancedPrecision(BaseModel):
    """Advanced precision metrics from src.precision module."""
    total_shots: int
    drms_cm: float
    r95_cm: float
    extreme_spread_cm: float
    # Rayleigh sigma with CI
    rayleigh_sigma: float
    rayleigh_ci_lower: float
    rayleigh_ci_upper: float
    # Accuracy vs Precision
    accuracy_pct: float
    precision_pct: float
    accuracy_precision_interpretation: str
    # Confidence Ellipse (normalized -1 to 1)
    ellipse_center_x: float
    ellipse_center_y: float
    ellipse_semi_major: float
    ellipse_semi_minor: float
    ellipse_angle_deg: float
    ellipse_correlation: float
    # Flier Detection
    flier_count: int
    flier_pct: float
    clean_sigma: float
    full_sigma: float
    flier_interpretation: str


class ConsistencyByRound(BaseModel):
    """Practice consistency metrics per round type."""
    round_type: str
    cv: float
    mean: float
    std: float
    interpretation: str
    session_count: int


class TrendAnalysis(BaseModel):
    """EWMA trends and practice consistency."""
    # Per-session data points (in date order)
    dates: List[str]
    round_types: List[str]
    scores: List[float]  # avg arrow score per session
    sigmas: List[float]  # sigma_r per session
    # EWMA
    score_ewma: List[float]
    score_ucl: List[float]
    score_lcl: List[float]
    sigma_ewma: List[float]
    sigma_ucl: List[float]
    sigma_lcl: List[float]
    # Consistency per round type
    consistency: List[ConsistencyByRound]


class ShotPosition(BaseModel):
    """Shot position within end."""
    position: int  # 1-indexed
    avg_score: float
    count: int


class WithinEndAnalysis(BaseModel):
    """Within-end shot position analysis."""
    positions: List[ShotPosition]
    best_position: int
    worst_position: int
    interpretation: str
    total_ends: int
    arrows_per_end_mode: int  # most common arrows-per-end


class RingProbability(BaseModel):
    """Probability of hitting a specific ring."""
    ring: int
    probability: float


class HitProbabilityAnalysis(BaseModel):
    """Hit probability for each scoring ring."""
    round_type: str
    total_shots: int
    sigma_x_cm: float
    sigma_y_cm: float
    mpi_x_cm: float
    mpi_y_cm: float
    face_size_cm: int
    ring_probs: List[RingProbability]
    expected_score: float


class EquipmentComparison(BaseModel):
    """Statistical comparison of two equipment setups."""
    setup_a: str
    setup_b: str
    setup_a_sessions: int
    setup_b_sessions: int
    score_diff: float
    score_p_value: float
    score_cohens_d: float
    sigma_diff: float
    sigma_p_value: float
    score_significant: bool
    sigma_significant: bool
    interpretation: str


class DashboardStats(BaseModel):
    """Dashboard statistics summary."""
    total_sessions: int
    total_arrows: int
    days_since_last_practice: Optional[int] = None
    last_session_score: Optional[int] = None
    last_session_round: Optional[str] = None
    last_session_date: Optional[str] = None
    rolling_avg_score: Optional[float] = None
    personal_best_score: Optional[int] = None
    personal_best_round: Optional[str] = None
    personal_best_date: Optional[str] = None
    sparkline_dates: List[str]
    sparkline_scores: List[float]


class ScoreGoalSimulation(BaseModel):
    """Result of a score-goal simulation."""
    goal_total_score: int
    goal_avg_arrow: float
    required_sigma_cm: float
    current_sigma_cm: Optional[float] = None
    current_avg_arrow: Optional[float] = None
    sigma_improvement_pct: Optional[float] = None  # how much tighter groups need to be
    distance_m: float
    face_cm: int
    feasible: bool  # is the goal physically achievable?
    interpretation: str


class ArrowShotCoord(BaseModel):
    """Individual shot coordinates for arrow heatmap."""
    x: float
    y: float
    score: int
    is_x: bool


class ArrowPerformance(BaseModel):
    """Per-arrow performance statistics."""
    arrow_number: int
    total_shots: int
    avg_score: float
    std_score: float
    avg_radius: float
    x_count: int
    ten_count: int
    miss_count: int
    shots: List[ArrowShotCoord]
    precision_score: float  # composite metric (lower = more precise)
    precision_rank: int     # 1 = best precision
    tier: str               # 'primary', 'secondary', or 'reserve'


class ArrowTier(BaseModel):
    """A group of arrows with similar precision."""
    name: str       # 'primary', 'secondary', 'reserve'
    label: str      # 'Primary Set', 'Secondary', 'Reserve'
    arrow_numbers: List[int]
    avg_precision_score: float
    avg_score: float
    avg_radius: float


class ArrowPerformanceSummary(BaseModel):
    """Arrow performance across the quiver."""
    arrows: List[ArrowPerformance]
    best_arrow: Optional[int] = None
    worst_arrow: Optional[int] = None
    total_shots_with_number: int
    total_shots_without_number: int
    interpretation: str
    face_cm: int
    tiers: List[ArrowTier]
    primary_set: List[int]          # recommended competition arrows
    group_size: int                 # how many in primary set


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


@router.get("/park-model", response_model=ParkModelAnalysis)
def get_park_model_analysis(
    short_round_type: str = Query(..., description="Short distance round type (e.g., 'WA 18m')"),
    long_round_type: str = Query(..., description="Long distance round type (e.g., 'WA 50m')"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Cross-distance analysis using the James Park Model.
    
    Compares archer performance at two distances to separate skill (sigma)
    from equipment drag loss.
    """
    # Helper function to get sessions and calculate average score
    def get_average_score_for_round(round_type: str):
        statement = select(SessionModel).options(
            selectinload(SessionModel.ends).selectinload(End.shots)
        ).where(SessionModel.round_type == round_type)
        
        # Apply date filters
        if from_date:
            start = _parse_date(from_date)
            statement = statement.where(SessionModel.date >= start)
        if to_date:
            end = _parse_date(to_date)
            statement = statement.where(SessionModel.date <= end)
        
        sessions = db.exec(statement).all()
        
        if not sessions:
            return None, 0, 0, 0
        
        total_score = 0
        total_shots = 0
        
        for session in sessions:
            for end in session.ends:
                for shot in end.shots:
                    total_score += shot.score
                    total_shots += 1
        
        avg_score = total_score / total_shots if total_shots > 0 else 0.0
        
        # Get distance and face size from first session (should be consistent for same round type)
        distance_m = sessions[0].distance_m
        face_cm = sessions[0].target_face_size_cm
        
        return avg_score, len(sessions), distance_m, face_cm
    
    # Get data for both rounds
    short_avg, short_count, short_dist, short_face = get_average_score_for_round(short_round_type)
    long_avg, long_count, long_dist, long_face = get_average_score_for_round(long_round_type)
    
    if short_avg is None or long_avg is None:
        # Return zeros if no data
        return ParkModelAnalysis(
            short_round=short_round_type,
            short_avg_score=0.0,
            short_session_count=short_count,
            short_sigma_cm=0.0,
            long_round=long_round_type,
            long_avg_score=0.0,
            long_session_count=long_count,
            long_sigma_cm=0.0,
            predicted_long_score=0.0,
            predicted_long_sigma=0.0,
            drag_loss_points=0.0,
            drag_loss_percent=0.0,
            sigma_theta_mrad=0.0
        )
    
    # Calculate sigma at each distance
    short_sigma = calculate_sigma_from_score(short_avg, short_face)
    long_sigma = calculate_sigma_from_score(long_avg, long_face)
    
    # Calculate angular error (sigma_theta) from short distance
    # sigma_r = distance * sigma_theta
    # Convert distance from meters to cm
    sigma_theta_rad = short_sigma / (short_dist * 100.0)
    sigma_theta_mrad = sigma_theta_rad * 1000.0  # Convert to milliradians
    
    # Predict long distance score from short distance skill
    predicted_long, predicted_long_sigma = predict_score_at_distance(
        short_avg, short_dist, short_face,
        long_dist, long_face
    )
    
    # Calculate drag loss
    drag_loss = predicted_long - long_avg
    drag_loss_pct = (drag_loss / predicted_long * 100.0) if predicted_long > 0 else 0.0
    
    return ParkModelAnalysis(
        short_round=short_round_type,
        short_avg_score=round(short_avg, 2),
        short_session_count=short_count,
        short_sigma_cm=round(short_sigma, 2),
        long_round=long_round_type,
        long_avg_score=round(long_avg, 2),
        long_session_count=long_count,
        long_sigma_cm=round(long_sigma, 2),
        predicted_long_score=round(predicted_long, 2),
        predicted_long_sigma=round(predicted_long_sigma, 2),
        drag_loss_points=round(drag_loss, 2),
        drag_loss_percent=round(drag_loss_pct, 1),
        sigma_theta_mrad=round(sigma_theta_mrad, 3)
    )


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


@router.get("/bias-analysis", response_model=BiasAnalysis)
def get_bias_analysis(
    round_type: Optional[str] = Query(None, description="Comma-separated round types to filter"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Analyze shot pattern bias and performance trends.
    
    Computes:
    - Mean Point of Impact (MPI) and directional bias
    - Horizontal/Vertical dispersion ratio
    - End fatigue analysis (declining performance over time)
    - First arrow penalty (if first shot of each end is consistently worse)
    """
    import math
    
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
        end_dt = _parse_date(to_date)
        statement = statement.where(SessionModel.date <= end_dt)
    
    sessions = db.exec(statement).all()
    
    # Collect all shots data
    all_x = []
    all_y = []
    all_scores = []
    end_data = {}  # end_number -> list of scores
    first_arrow_scores = []
    other_arrow_scores = []
    face_sizes = []
    
    for session in sessions:
        face_sizes.append(session.target_face_size_cm)
        for end in session.ends:
            end_num = end.end_number
            if end_num not in end_data:
                end_data[end_num] = []
            
            # Sort by shot_sequence if available, else fallback to (arrow_number, id) for backward compatibility
            def shot_sort_key(s):
                if s.shot_sequence is not None:
                    return (s.shot_sequence, s.id)
                return (s.arrow_number or 999999, s.id)
            
            for idx, shot in enumerate(sorted(end.shots, key=shot_sort_key)):
                all_x.append(shot.x)
                all_y.append(shot.y)
                all_scores.append(shot.score)
                end_data[end_num].append(shot.score)
                
                # Track first vs other arrows (first shot is index 0)
                if idx == 0:
                    first_arrow_scores.append(shot.score)
                else:
                    other_arrow_scores.append(shot.score)
    
    total_shots = len(all_x)
    
    # Handle no data case
    if total_shots == 0:
        return BiasAnalysis(
            total_shots=0,
            mpi_x_cm=0.0,
            mpi_y_cm=0.0,
            mpi_x_normalized=0.0,
            mpi_y_normalized=0.0,
            bias_direction="Center",
            bias_magnitude_cm=0.0,
            bias_magnitude_normalized=0.0,
            sigma_x_cm=0.0,
            sigma_y_cm=0.0,
            hv_ratio=1.0,
            hv_interpretation="Balanced",
            fatigue_slope=0.0,
            fatigue_correlation=0.0,
            fatigue_interpretation="No fatigue detected",
            end_scores=[],
            first_arrow_avg=0.0,
            other_arrows_avg=0.0,
            first_arrow_penalty=0.0,
            first_arrow_interpretation="No first-arrow effect"
        )
    
    # Calculate average face size for normalization
    avg_face_size = float(np.mean(face_sizes))
    face_radius = avg_face_size / 2.0
    
    # 1. Mean Point of Impact (MPI)
    mpi_x = float(np.mean(all_x))
    mpi_y = float(np.mean(all_y))
    mpi_x_norm = mpi_x / face_radius  # Normalize to -1 to 1
    mpi_y_norm = mpi_y / face_radius
    
    # 2. Directional Bias
    bias_mag_cm = float(np.sqrt(mpi_x**2 + mpi_y**2))
    bias_mag_norm = bias_mag_cm / face_radius
    
    # Calculate direction (compass bearing)
    if bias_mag_norm < 0.02:  # Less than 2% of radius = centered
        bias_direction = "Center"
    else:
        # atan2(y, x) gives angle where 0=East, pi/2=North
        angle = math.atan2(mpi_y, mpi_x)
        # Convert to compass directions (N, NE, E, SE, S, SW, W, NW)
        directions = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"]
        idx = round(angle / (math.pi / 4)) % 8
        bias_direction = directions[idx]
    
    # 3. H/V Bias Ratio
    if total_shots > 1:
        sigma_x = float(np.std(all_x))
        sigma_y = float(np.std(all_y))
        hv_ratio = sigma_x / sigma_y if sigma_y > 0 else 1.0
        
        if hv_ratio > 1.2:
            hv_interpretation = "Horizontal-dominant"
        elif hv_ratio < 0.8:
            hv_interpretation = "Vertical-dominant"
        else:
            hv_interpretation = "Balanced"
    else:
        sigma_x = 0.0
        sigma_y = 0.0
        hv_ratio = 1.0
        hv_interpretation = "Balanced"
    
    # 4. End Fatigue Analysis
    end_scores_list = []
    for end_num in sorted(end_data.keys()):
        scores = end_data[end_num]
        avg_score = float(np.mean(scores))
        end_scores_list.append(EndScore(
            end_number=end_num,
            avg_score=round(avg_score, 2),
            shot_count=len(scores)
        ))
    
    # Calculate fatigue correlation and slope
    if len(end_scores_list) > 1:
        end_nums = np.array([es.end_number for es in end_scores_list])
        avg_scores = np.array([es.avg_score for es in end_scores_list])
        
        # Check if there's variation in scores (avoid NaN from zero variance)
        if np.std(avg_scores) > 0.01:
            fatigue_corr = float(np.corrcoef(end_nums, avg_scores)[0, 1])
            fatigue_slope = float(np.polyfit(end_nums, avg_scores, 1)[0])
        else:
            # No variation in scores = no fatigue
            fatigue_corr = 0.0
            fatigue_slope = 0.0
        
        # Interpretation
        if fatigue_corr < -0.7:  # Strong negative correlation
            pts_drop = abs(fatigue_slope * len(end_scores_list))
            fatigue_interp = f"Moderate to strong fatigue detected (last ends drop ~{pts_drop:.1f} pts)"
        elif fatigue_corr < -0.4:  # Moderate negative correlation
            pts_drop = abs(fatigue_slope * len(end_scores_list))
            fatigue_interp = f"Mild fatigue detected (last ends drop ~{pts_drop:.1f} pts)"
        else:
            fatigue_interp = "No fatigue detected"
    else:
        fatigue_corr = 0.0
        fatigue_slope = 0.0
        fatigue_interp = "No fatigue detected"
    
    # 5. First Arrow Analysis
    if first_arrow_scores:
        first_avg = float(np.mean(first_arrow_scores))
        other_avg = float(np.mean(other_arrow_scores)) if other_arrow_scores else first_avg
        first_penalty = first_avg - other_avg
        
        if first_penalty < -0.3:
            first_interp = f"First-arrow penalty detected ({first_penalty:.1f} pts)"
        elif first_penalty > 0.3:
            first_interp = f"First-arrow advantage detected (+{first_penalty:.1f} pts)"
        else:
            first_interp = "No first-arrow effect"
    else:
        first_avg = 0.0
        other_avg = 0.0
        first_penalty = 0.0
        first_interp = "No first-arrow effect"
    
    return BiasAnalysis(
        total_shots=total_shots,
        mpi_x_cm=round(mpi_x, 2),
        mpi_y_cm=round(mpi_y, 2),
        mpi_x_normalized=round(mpi_x_norm, 3),
        mpi_y_normalized=round(mpi_y_norm, 3),
        bias_direction=bias_direction,
        bias_magnitude_cm=round(bias_mag_cm, 2),
        bias_magnitude_normalized=round(bias_mag_norm, 3),
        sigma_x_cm=round(sigma_x, 2),
        sigma_y_cm=round(sigma_y, 2),
        hv_ratio=round(hv_ratio, 2),
        hv_interpretation=hv_interpretation,
        fatigue_slope=round(fatigue_slope, 3),
        fatigue_correlation=round(fatigue_corr, 3),
        fatigue_interpretation=fatigue_interp,
        end_scores=end_scores_list,
        first_arrow_avg=round(first_avg, 2),
        other_arrows_avg=round(other_avg, 2),
        first_arrow_penalty=round(first_penalty, 2),
        first_arrow_interpretation=first_interp
    )


@router.get("/advanced-precision", response_model=AdvancedPrecision)
def get_advanced_precision(
    round_type: Optional[str] = Query(None, description="Comma-separated round types to filter"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Compute advanced precision metrics for filtered shot set.
    
    Returns DRMS, R95, extreme spread, Rayleigh sigma with CI, 
    accuracy/precision decomposition, confidence ellipse, and flier detection.
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
        end_dt = _parse_date(to_date)
        statement = statement.where(SessionModel.date <= end_dt)
    
    sessions = db.exec(statement).all()
    
    # Collect all shots
    all_x = []
    all_y = []
    face_sizes = []
    
    for session in sessions:
        face_sizes.append(session.target_face_size_cm)
        for end in session.ends:
            for shot in end.shots:
                all_x.append(shot.x)
                all_y.append(shot.y)
    
    total_shots = len(all_x)
    
    if total_shots == 0:
        return AdvancedPrecision(
            total_shots=0, drms_cm=0.0, r95_cm=0.0, extreme_spread_cm=0.0,
            rayleigh_sigma=0.0, rayleigh_ci_lower=0.0, rayleigh_ci_upper=0.0,
            accuracy_pct=0.0, precision_pct=0.0, accuracy_precision_interpretation="No data",
            ellipse_center_x=0.0, ellipse_center_y=0.0, ellipse_semi_major=0.0,
            ellipse_semi_minor=0.0, ellipse_angle_deg=0.0, ellipse_correlation=0.0,
            flier_count=0, flier_pct=0.0, clean_sigma=0.0, full_sigma=0.0,
            flier_interpretation="No data"
        )
    
    xs = np.array(all_x)
    ys = np.array(all_y)
    avg_face_size = float(np.mean(face_sizes))
    
    # Compute metrics using precision module
    drms = precision.compute_drms(xs, ys)
    r95 = precision.compute_r95(xs, ys)
    extreme_spread = precision.compute_extreme_spread(xs, ys)
    rayleigh_result = precision.compute_rayleigh_sigma_with_ci(xs, ys)
    accuracy_result = precision.compute_accuracy_precision_ratio(xs, ys)
    
    # Normalize coordinates for ellipse (to -1 to 1 range)
    face_radius = avg_face_size / 2.0
    xs_norm = xs / face_radius
    ys_norm = ys / face_radius
    ellipse_result = precision.compute_confidence_ellipse(xs_norm, ys_norm)
    
    flier_result = precision.detect_fliers(xs, ys)
    
    return AdvancedPrecision(
        total_shots=total_shots,
        drms_cm=round(drms, 3),
        r95_cm=round(r95, 3),
        extreme_spread_cm=round(extreme_spread, 3),
        rayleigh_sigma=rayleigh_result["sigma"],
        rayleigh_ci_lower=rayleigh_result["ci_lower"],
        rayleigh_ci_upper=rayleigh_result["ci_upper"],
        accuracy_pct=accuracy_result["accuracy_pct"],
        precision_pct=accuracy_result["precision_pct"],
        accuracy_precision_interpretation=accuracy_result["interpretation"],
        ellipse_center_x=ellipse_result["center_x"],
        ellipse_center_y=ellipse_result["center_y"],
        ellipse_semi_major=ellipse_result["semi_major"],
        ellipse_semi_minor=ellipse_result["semi_minor"],
        ellipse_angle_deg=ellipse_result["angle_deg"],
        ellipse_correlation=ellipse_result["correlation"],
        flier_count=flier_result["flier_count"],
        flier_pct=flier_result["flier_pct"],
        clean_sigma=flier_result["clean_sigma"],
        full_sigma=flier_result["full_sigma"],
        flier_interpretation=flier_result["interpretation"]
    )


@router.get("/trends", response_model=TrendAnalysis)
def get_trends(
    round_type: Optional[str] = Query(None, description="Comma-separated round types to filter"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    EWMA trends for scores and sigma, plus practice consistency.
    
    Returns per-session scores and sigmas with EWMA control charts,
    plus coefficient of variation grouped by round type.
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
        end_dt = _parse_date(to_date)
        statement = statement.where(SessionModel.date <= end_dt)
    
    sessions = db.exec(statement).all()
    
    # Per-session data
    dates = []
    round_types_list = []
    scores = []
    sigmas = []
    
    # Group by round type for consistency
    by_round_type = {}
    
    for session in sessions:
        total_score = 0
        shot_count = 0
        xs = []
        ys = []
        
        for end in session.ends:
            for shot in end.shots:
                total_score += shot.score
                shot_count += 1
                xs.append(shot.x)
                ys.append(shot.y)
        
        if shot_count > 0:
            avg_score = total_score / shot_count
            # Compute sigma: sqrt(var_x + var_y)
            sigma = float(np.sqrt(np.var(xs, ddof=0) + np.var(ys, ddof=0))) if shot_count > 1 else 0.0
            
            dates.append(session.date.isoformat())
            round_types_list.append(session.round_type)
            scores.append(round(avg_score, 3))
            sigmas.append(round(sigma, 3))
            
            # Group for consistency
            if session.round_type not in by_round_type:
                by_round_type[session.round_type] = []
            by_round_type[session.round_type].append(total_score)
    
    # Compute EWMA
    if len(scores) >= 2:
        score_ewma_result = precision.compute_ewma(scores, lam=0.2)
        sigma_ewma_result = precision.compute_ewma(sigmas, lam=0.3)
    else:
        # Not enough data for EWMA
        score_ewma_result = {"ewma": scores, "ucl": scores, "lcl": scores, "mean": scores[0] if scores else 0.0, "sigma": 0.0}
        sigma_ewma_result = {"ewma": sigmas, "ucl": sigmas, "lcl": sigmas, "mean": sigmas[0] if sigmas else 0.0, "sigma": 0.0}
    
    # Compute consistency per round type
    consistency_list = []
    for rt, total_scores in by_round_type.items():
        consistency_result = precision.compute_practice_consistency(total_scores)
        consistency_list.append(ConsistencyByRound(
            round_type=rt,
            cv=consistency_result["cv"],
            mean=consistency_result["mean"],
            std=consistency_result["std"],
            interpretation=consistency_result["interpretation"],
            session_count=len(total_scores)
        ))
    
    return TrendAnalysis(
        dates=dates,
        round_types=round_types_list,
        scores=scores,
        sigmas=sigmas,
        score_ewma=score_ewma_result["ewma"],
        score_ucl=score_ewma_result["ucl"],
        score_lcl=score_ewma_result["lcl"],
        sigma_ewma=sigma_ewma_result["ewma"],
        sigma_ucl=sigma_ewma_result["ucl"],
        sigma_lcl=sigma_ewma_result["lcl"],
        consistency=consistency_list
    )


@router.get("/within-end", response_model=WithinEndAnalysis)
def get_within_end_analysis(
    round_type: Optional[str] = Query(None, description="Comma-separated round types to filter"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Within-end shot position analysis.
    
    Analyzes whether certain shot positions within an end (1st, 2nd, 3rd, etc.)
    consistently score higher or lower.
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
        end_dt = _parse_date(to_date)
        statement = statement.where(SessionModel.date <= end_dt)
    
    sessions = db.exec(statement).all()
    
    # Collect shots by position
    shots_by_position = {}
    arrows_per_end_counts = []
    total_ends = 0
    
    for session in sessions:
        for end in session.ends:
            total_ends += 1
            arrows_per_end_counts.append(len(end.shots))
            
            # Sort by shot_sequence if available, else fallback to (arrow_number, id) for backward compatibility
            def shot_sort_key(s):
                if s.shot_sequence is not None:
                    return (s.shot_sequence, s.id)
                return (s.arrow_number or 999999, s.id)
            
            for idx, shot in enumerate(sorted(end.shots, key=shot_sort_key)):
                if idx not in shots_by_position:
                    shots_by_position[idx] = []
                shots_by_position[idx].append(float(shot.score))
    
    if not shots_by_position:
        return WithinEndAnalysis(
            positions=[],
            best_position=0,
            worst_position=0,
            interpretation="No data",
            total_ends=0,
            arrows_per_end_mode=0
        )
    
    # Compute mode of arrows per end
    from collections import Counter
    arrows_per_end_mode = Counter(arrows_per_end_counts).most_common(1)[0][0] if arrows_per_end_counts else 0
    
    # Use precision module function
    trend_result = precision.compute_within_end_trend(shots_by_position)
    
    # Convert to ShotPosition objects
    positions_list = [ShotPosition(**pos) for pos in trend_result["positions"]]
    
    return WithinEndAnalysis(
        positions=positions_list,
        best_position=trend_result["best_position"],
        worst_position=trend_result["worst_position"],
        interpretation=trend_result["interpretation"],
        total_ends=total_ends,
        arrows_per_end_mode=arrows_per_end_mode
    )


@router.get("/hit-probability", response_model=HitProbabilityAnalysis)
def get_hit_probability(
    round_type: str = Query(..., description="Round type (required)"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Ring hit probability for a given round type.
    
    Computes the probability of hitting each scoring ring (10 down to miss)
    based on bivariate normal distribution fitted to shot data.
    """
    # Build query
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots)
    ).where(SessionModel.round_type == round_type)
    
    # Apply date filters
    if from_date:
        start = _parse_date(from_date)
        statement = statement.where(SessionModel.date >= start)
    
    if to_date:
        end_dt = _parse_date(to_date)
        statement = statement.where(SessionModel.date <= end_dt)
    
    sessions = db.exec(statement).all()
    
    # Collect shots
    xs = []
    ys = []
    face_sizes = []
    
    for session in sessions:
        face_sizes.append(session.target_face_size_cm)
        for end in session.ends:
            for shot in end.shots:
                xs.append(shot.x)
                ys.append(shot.y)
    
    total_shots = len(xs)
    
    if total_shots == 0:
        return HitProbabilityAnalysis(
            round_type=round_type,
            total_shots=0,
            sigma_x_cm=0.0,
            sigma_y_cm=0.0,
            mpi_x_cm=0.0,
            mpi_y_cm=0.0,
            face_size_cm=40,
            ring_probs=[],
            expected_score=0.0
        )
    
    xs_arr = np.array(xs)
    ys_arr = np.array(ys)
    
    # Compute statistics
    sigma_x = float(np.std(xs_arr, ddof=0))
    sigma_y = float(np.std(ys_arr, ddof=0))
    mpi_x = float(np.mean(xs_arr))
    mpi_y = float(np.mean(ys_arr))
    
    face_size_cm = int(np.mean(face_sizes))
    
    # Compute hit probability
    hit_prob_result = precision.compute_hit_probability(
        sigma_x, sigma_y, mpi_x, mpi_y, face_size_cm
    )
    
    ring_probs_list = [RingProbability(**rp) for rp in hit_prob_result["ring_probs"]]
    
    return HitProbabilityAnalysis(
        round_type=round_type,
        total_shots=total_shots,
        sigma_x_cm=round(sigma_x, 3),
        sigma_y_cm=round(sigma_y, 3),
        mpi_x_cm=round(mpi_x, 3),
        mpi_y_cm=round(mpi_y, 3),
        face_size_cm=face_size_cm,
        ring_probs=ring_probs_list,
        expected_score=hit_prob_result["expected_score"]
    )


@router.get("/equipment-comparison", response_model=EquipmentComparison)
def get_equipment_comparison(
    setup_a_bow_id: Optional[str] = Query(None, description="Bow ID for setup A"),
    setup_a_arrow_id: Optional[str] = Query(None, description="Arrow ID for setup A"),
    setup_b_bow_id: Optional[str] = Query(None, description="Bow ID for setup B"),
    setup_b_arrow_id: Optional[str] = Query(None, description="Arrow ID for setup B"),
    round_type: Optional[str] = Query(None, description="Filter to specific round type"),
    from_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db)
):
    """
    Compare two equipment setups statistically.
    
    Performs Welch's t-test on scores and sigmas to determine if there's
    a significant difference between two bow/arrow configurations.
    """
    def get_setup_stats(bow_id: Optional[str], arrow_id: Optional[str]):
        """Helper to get sessions and compute stats for one setup."""
        statement = select(SessionModel).options(
            selectinload(SessionModel.ends).selectinload(End.shots),
            selectinload(SessionModel.bow),
            selectinload(SessionModel.arrow)
        )
        
        # Filter by equipment
        if bow_id:
            statement = statement.where(SessionModel.bow_id == bow_id)
        if arrow_id:
            statement = statement.where(SessionModel.arrow_id == arrow_id)
        
        # Filter by round type
        if round_type:
            statement = statement.where(SessionModel.round_type == round_type)
        
        # Apply date filters
        if from_date:
            start = _parse_date(from_date)
            statement = statement.where(SessionModel.date >= start)
        if to_date:
            end_dt = _parse_date(to_date)
            statement = statement.where(SessionModel.date <= end_dt)
        
        sessions = db.exec(statement).all()
        
        # Compute per-session scores and sigmas
        avg_scores = []
        sigmas = []
        name_parts = []
        
        for session in sessions:
            total_score = 0
            shot_count = 0
            xs = []
            ys = []
            
            for end in session.ends:
                for shot in end.shots:
                    total_score += shot.score
                    shot_count += 1
                    xs.append(shot.x)
                    ys.append(shot.y)
            
            if shot_count > 0:
                avg_score = total_score / shot_count
                avg_scores.append(avg_score)
                
                # Compute sigma
                sigma = float(np.sqrt(np.var(xs, ddof=0) + np.var(ys, ddof=0))) if shot_count > 1 else 0.0
                sigmas.append(sigma)
        
        # Build name from first session (check once, not in loop)
        if sessions:
            first_session = sessions[0]
            if first_session.bow:
                name_parts.append(first_session.bow.name)
            if first_session.arrow:
                name_parts.append(f"{first_session.arrow.make} {first_session.arrow.model}")
        
        setup_name = " + ".join(name_parts) if name_parts else "Unknown Setup"
        
        return avg_scores, sigmas, setup_name, len(sessions)
    
    # Get data for both setups
    a_scores, a_sigmas, a_name, a_count = get_setup_stats(setup_a_bow_id, setup_a_arrow_id)
    b_scores, b_sigmas, b_name, b_count = get_setup_stats(setup_b_bow_id, setup_b_arrow_id)
    
    # Use precision module for comparison
    comparison_result = precision.compute_equipment_comparison(
        a_scores, a_sigmas, a_name,
        b_scores, b_sigmas, b_name
    )
    
    return EquipmentComparison(
        setup_a=comparison_result["setup_a"],
        setup_b=comparison_result["setup_b"],
        setup_a_sessions=a_count,
        setup_b_sessions=b_count,
        score_diff=comparison_result["score_diff"],
        score_p_value=comparison_result["score_p_value"],
        score_cohens_d=comparison_result["score_cohens_d"],
        sigma_diff=comparison_result["sigma_diff"],
        sigma_p_value=comparison_result["sigma_p_value"],
        score_significant=comparison_result["score_significant"],
        sigma_significant=comparison_result["sigma_significant"],
        interpretation=comparison_result["interpretation"]
    )


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


@router.get("/score-goal", response_model=ScoreGoalSimulation)
def score_goal_simulation(
    goal_total_score: int = Query(..., description="Target total score for round"),
    total_arrows: int = Query(30, description="Number of arrows in round"),
    distance_m: float = Query(18, description="Shooting distance in metres"),
    face_cm: int = Query(40, description="Target face diameter in cm"),
    round_type: Optional[str] = Query(None, description="Filter current sigma to this round type"),
    db: SQLModelSession = Depends(get_db),
):
    """
    Reverse-solves the Park Model to find the precision (sigma) needed to
    achieve a goal score, and compares it to the archer's current precision.
    """
    from src.park_model import calculate_expected_score, calculate_sigma_from_score

    goal_avg_arrow = goal_total_score / total_arrows
    if goal_avg_arrow > 10:
        goal_avg_arrow = 10.0

    # Required sigma for goal
    required_sigma = calculate_sigma_from_score(goal_avg_arrow, face_cm)

    # Current sigma from sessions
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots)
    )
    if round_type:
        round_types = [rt.strip() for rt in round_type.split(",")]
        statement = statement.where(SessionModel.round_type.in_(round_types))
    sessions = db.exec(statement).all()

    current_sigma = None
    current_avg = None
    sigma_improvement = None

    if sessions:
        all_xs = []
        all_ys = []
        total_score = 0
        total_shots = 0
        for session in sessions:
            for end in session.ends:
                for shot in end.shots:
                    all_xs.append(shot.x)
                    all_ys.append(shot.y)
                    total_score += shot.score
                    total_shots += 1
        if total_shots > 0:
            xs = np.array(all_xs)
            ys = np.array(all_ys)
            sx = float(np.std(xs))
            sy = float(np.std(ys))
            current_sigma = float(np.sqrt(sx**2 + sy**2) / np.sqrt(2))
            # x,y are already stored in cm — no conversion needed
            current_avg = total_score / total_shots
            if current_sigma > 0:
                sigma_improvement = ((current_sigma - required_sigma) / current_sigma) * 100.0

    feasible = goal_avg_arrow <= 10.0

    # Build interpretation
    if not feasible:
        interp = f"A score of {goal_total_score}/{total_arrows * 10} exceeds the maximum possible."
    elif current_sigma is None:
        interp = f"To average {goal_avg_arrow:.2f}/arrow you need σ ≤ {required_sigma:.2f} cm. No sessions available for comparison."
    elif sigma_improvement is not None and sigma_improvement <= 0:
        interp = f"You're already there! Your current σ ({current_sigma:.2f} cm) is tighter than the required σ ({required_sigma:.2f} cm)."
    else:
        interp = f"You need to tighten your groups by {sigma_improvement:.0f}% (from σ={current_sigma:.2f} cm to σ={required_sigma:.2f} cm)."

    return ScoreGoalSimulation(
        goal_total_score=goal_total_score,
        goal_avg_arrow=round(goal_avg_arrow, 3),
        required_sigma_cm=round(required_sigma, 3),
        current_sigma_cm=round(current_sigma, 3) if current_sigma is not None else None,
        current_avg_arrow=round(current_avg, 3) if current_avg is not None else None,
        sigma_improvement_pct=round(sigma_improvement, 1) if sigma_improvement is not None else None,
        distance_m=distance_m,
        face_cm=face_cm,
        feasible=feasible,
        interpretation=interp,
    )


@router.get("/arrow-performance", response_model=ArrowPerformanceSummary)
def arrow_performance(
    round_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    group_size: int = Query(6, ge=1, description="Number of arrows in the primary competition set"),
    db: SQLModelSession = Depends(get_db),
):
    """
    Per-arrow-number performance breakdown to identify strong/weak shafts.
    """
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots)
    )
    if round_type:
        round_types = [rt.strip() for rt in round_type.split(",")]
        statement = statement.where(SessionModel.round_type.in_(round_types))
    if from_date:
        statement = statement.where(SessionModel.date >= _parse_date(from_date))
    if to_date:
        statement = statement.where(SessionModel.date <= _parse_date(to_date))

    sessions = db.exec(statement).all()

    # Collect shots keyed by arrow_number
    arrow_data: dict[int, list[dict]] = {}
    total_with = 0
    total_without = 0
    most_common_face = None

    for session in sessions:
        face_cm = session.target_face_size_cm
        if most_common_face is None:
            most_common_face = face_cm
        for end in session.ends:
            for shot in end.shots:
                if shot.arrow_number is not None:
                    total_with += 1
                    arrow_data.setdefault(shot.arrow_number, []).append({
                        "score": shot.score,
                        "x": shot.x,
                        "y": shot.y,
                        "is_x": shot.is_x,
                        "face_cm": face_cm,
                    })
                else:
                    total_without += 1

    arrows: list[ArrowPerformance] = []
    for num in sorted(arrow_data.keys()):
        shots = arrow_data[num]
        scores = [s["score"] for s in shots]
        radii = [np.sqrt(s["x"]**2 + s["y"]**2) for s in shots]  # x,y already in cm
        shot_coords = [
            ArrowShotCoord(x=s["x"], y=s["y"], score=s["score"], is_x=s["is_x"])
            for s in shots
        ]
        avg_r = float(np.mean(radii))
        std_s = float(np.std(scores))
        # Composite precision score: lower is more precise.
        # Combines group tightness (avg_radius) with scoring consistency (std_score).
        # Weighted 60/40 towards spatial tightness — the truer measure of shaft quality.
        precision_score = round(0.6 * avg_r + 0.4 * std_s, 4)
        arrows.append(ArrowPerformance(
            arrow_number=num,
            total_shots=len(shots),
            avg_score=round(float(np.mean(scores)), 3),
            std_score=round(std_s, 3),
            avg_radius=round(avg_r, 3),
            x_count=sum(1 for s in shots if s["is_x"]),
            ten_count=sum(1 for s in shots if s["score"] >= 10),
            miss_count=sum(1 for s in shots if s["score"] == 0),
            shots=shot_coords,
            precision_score=precision_score,
            precision_rank=0,  # filled below
            tier='',           # filled below
        ))

    # --- Rank & tier assignment ---
    # Sort by precision_score ascending (lower = better)
    ranked = sorted(arrows, key=lambda a: a.precision_score)
    for rank_idx, arrow in enumerate(ranked):
        arrow.precision_rank = rank_idx + 1

    # Assign tiers based on rank relative to group_size
    actual_group = min(group_size, len(ranked))
    primary_set: list[int] = []
    for arrow in ranked:
        if arrow.precision_rank <= actual_group:
            arrow.tier = 'primary'
            primary_set.append(arrow.arrow_number)
        elif arrow.precision_rank <= actual_group + (len(ranked) - actual_group) // 2:
            arrow.tier = 'secondary'
        else:
            arrow.tier = 'reserve'

    # Build tier summaries
    tiers: list[ArrowTier] = []
    for tier_name, tier_label in [('primary', 'Primary Set'), ('secondary', 'Secondary'), ('reserve', 'Reserve')]:
        tier_arrows = [a for a in ranked if a.tier == tier_name]
        if tier_arrows:
            tiers.append(ArrowTier(
                name=tier_name,
                label=tier_label,
                arrow_numbers=[a.arrow_number for a in tier_arrows],
                avg_precision_score=round(float(np.mean([a.precision_score for a in tier_arrows])), 3),
                avg_score=round(float(np.mean([a.avg_score for a in tier_arrows])), 3),
                avg_radius=round(float(np.mean([a.avg_radius for a in tier_arrows])), 3),
            ))

    best = max(arrows, key=lambda a: a.avg_score).arrow_number if arrows else None
    worst = min(arrows, key=lambda a: a.avg_score).arrow_number if arrows else None

    if not arrows:
        interp = "No arrow-numbered shots recorded yet. Select arrows in the quiver panel during session logging."
    elif len(arrows) == 1:
        interp = "Only one arrow tracked. Shoot more sessions with arrow numbers to compare."
    else:
        spread = max(a.avg_score for a in arrows) - min(a.avg_score for a in arrows)
        if spread < 0.3:
            interp = f"Your arrows are very consistent (spread {spread:.2f} pts). No weak links."
        elif spread < 0.7:
            interp = f"Arrow #{worst} underperforms slightly (avg {min(a.avg_score for a in arrows):.2f} vs best {max(a.avg_score for a in arrows):.2f}). Consider checking straightness."
        else:
            interp = f"Arrow #{worst} is significantly weaker (spread {spread:.2f} pts). Inspect or replace it."

    return ArrowPerformanceSummary(
        arrows=arrows,
        best_arrow=best,
        worst_arrow=worst,
        total_shots_with_number=total_with,
        total_shots_without_number=total_without,
        interpretation=interp,
        face_cm=most_common_face or 40,
        tiers=tiers,
        primary_set=primary_set,
        group_size=actual_group,
    )
