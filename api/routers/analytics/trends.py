import numpy as np
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import selectinload
from sqlmodel import Session as SQLModelSession
from sqlmodel import select

from api.deps import get_db
from src import precision
from src.models import End
from src.models import Session as SessionModel
from src.park_model import calculate_sigma_from_score, predict_score_at_distance

from ._schemas import ConsistencyByRound, EquipmentComparison, ParkModelAnalysis, TrendAnalysis
from ._shared import _parse_date

router = APIRouter()


@router.get("/park-model", response_model=ParkModelAnalysis)
def get_park_model_analysis(
    short_round_type: str = Query(..., description="Short distance round type (e.g., 'WA 18m')"),
    long_round_type: str = Query(..., description="Long distance round type (e.g., 'WA 50m')"),
    from_date: str | None = Query(None, description="Start date filter (ISO format)"),
    to_date: str | None = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db),
):
    """
    Cross-distance analysis using the James Park Model.

    Compares archer performance at two distances to separate skill (sigma)
    from equipment drag loss.
    """

    # Helper function to get sessions and calculate average score
    def get_average_score_for_round(round_type: str):
        statement = (
            select(SessionModel)
            .options(selectinload(SessionModel.ends).selectinload(End.shots))
            .where(SessionModel.round_type == round_type)
        )

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
            sigma_theta_mrad=0.0,
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
        short_avg, short_dist, short_face, long_dist, long_face
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
        sigma_theta_mrad=round(sigma_theta_mrad, 3),
    )


@router.get("/trends", response_model=TrendAnalysis)
def get_trends(
    round_type: str | None = Query(None, description="Comma-separated round types to filter"),
    from_date: str | None = Query(None, description="Start date filter (ISO format)"),
    to_date: str | None = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db),
):
    """
    EWMA trends for scores and sigma, plus practice consistency.

    Returns per-session scores and sigmas with EWMA control charts,
    plus coefficient of variation grouped by round type.
    """
    # Build query
    statement = (
        select(SessionModel)
        .options(selectinload(SessionModel.ends).selectinload(End.shots))
        .order_by(SessionModel.date)
    )

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
        score_ewma_result = {
            "ewma": scores,
            "ucl": scores,
            "lcl": scores,
            "mean": scores[0] if scores else 0.0,
            "sigma": 0.0,
        }
        sigma_ewma_result = {
            "ewma": sigmas,
            "ucl": sigmas,
            "lcl": sigmas,
            "mean": sigmas[0] if sigmas else 0.0,
            "sigma": 0.0,
        }

    # Compute consistency per round type
    consistency_list = []
    for rt, total_scores in by_round_type.items():
        consistency_result = precision.compute_practice_consistency(total_scores)
        consistency_list.append(
            ConsistencyByRound(
                round_type=rt,
                cv=consistency_result["cv"],
                mean=consistency_result["mean"],
                std=consistency_result["std"],
                interpretation=consistency_result["interpretation"],
                session_count=len(total_scores),
            )
        )

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
        consistency=consistency_list,
    )


@router.get("/equipment-comparison", response_model=EquipmentComparison)
def get_equipment_comparison(
    setup_a_bow_id: str | None = Query(None, description="Bow ID for setup A"),
    setup_a_arrow_id: str | None = Query(None, description="Arrow ID for setup A"),
    setup_b_bow_id: str | None = Query(None, description="Bow ID for setup B"),
    setup_b_arrow_id: str | None = Query(None, description="Arrow ID for setup B"),
    round_type: str | None = Query(None, description="Filter to specific round type"),
    from_date: str | None = Query(None, description="Start date filter (ISO format)"),
    to_date: str | None = Query(None, description="End date filter (ISO format)"),
    db: SQLModelSession = Depends(get_db),
):
    """
    Compare two equipment setups statistically.

    Performs Welch's t-test on scores and sigmas to determine if there's
    a significant difference between two bow/arrow configurations.
    """

    def get_setup_stats(bow_id: str | None, arrow_id: str | None):
        """Helper to get sessions and compute stats for one setup."""
        statement = select(SessionModel).options(
            selectinload(SessionModel.ends).selectinload(End.shots),
            selectinload(SessionModel.bow),
            selectinload(SessionModel.arrow),
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
    comparison_result = precision.compute_equipment_comparison(a_scores, a_sigmas, a_name, b_scores, b_sigmas, b_name)

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
        interpretation=comparison_result["interpretation"],
    )
