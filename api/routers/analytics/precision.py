from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import selectinload
from sqlmodel import Session as SQLModelSession, select

from api.deps import get_db
from src import precision
from src.models import End, Session as SessionModel

from ._schemas import AdvancedPrecision, BiasAnalysis, EndScore, HitProbabilityAnalysis, RingProbability, ShotPosition, WithinEndAnalysis
from ._shared import _parse_date

router = APIRouter()


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
