import numpy as np
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import selectinload
from sqlmodel import Session as SQLModelSession
from sqlmodel import select

from api.deps import get_db
from src.models import End
from src.models import Session as SessionModel

from ._schemas import ArrowPerformance, ArrowPerformanceSummary, ArrowShotCoord, ArrowTier, ScoreGoalSimulation
from ._shared import _parse_date

router = APIRouter()


@router.get("/score-goal", response_model=ScoreGoalSimulation)
def score_goal_simulation(
    goal_total_score: int = Query(..., description="Target total score for round"),
    total_arrows: int = Query(30, description="Number of arrows in round"),
    distance_m: float = Query(18, description="Shooting distance in metres"),
    face_cm: int = Query(40, description="Target face diameter in cm"),
    round_type: str | None = Query(None, description="Filter current sigma to this round type"),
    db: SQLModelSession = Depends(get_db),
):
    """
    Reverse-solves the Park Model to find the precision (sigma) needed to
    achieve a goal score, and compares it to the archer's current precision.
    """
    from src.park_model import calculate_sigma_from_score

    goal_avg_arrow = goal_total_score / total_arrows
    if goal_avg_arrow > 10:
        goal_avg_arrow = 10.0

    # Required sigma for goal
    required_sigma = calculate_sigma_from_score(goal_avg_arrow, face_cm)

    # Current sigma from sessions
    statement = select(SessionModel).options(selectinload(SessionModel.ends).selectinload(End.shots))
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
    round_type: str | None = Query(None),
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    group_size: int = Query(6, ge=1, description="Number of arrows in the primary competition set"),
    db: SQLModelSession = Depends(get_db),
):
    """
    Per-arrow-number performance breakdown to identify strong/weak shafts.
    """
    statement = select(SessionModel).options(selectinload(SessionModel.ends).selectinload(End.shots))
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
                    arrow_data.setdefault(shot.arrow_number, []).append(
                        {
                            "score": shot.score,
                            "x": shot.x,
                            "y": shot.y,
                            "is_x": shot.is_x,
                            "face_cm": face_cm,
                        }
                    )
                else:
                    total_without += 1

    arrows: list[ArrowPerformance] = []
    for num in sorted(arrow_data.keys()):
        shots = arrow_data[num]
        scores = [s["score"] for s in shots]
        radii = [np.sqrt(s["x"] ** 2 + s["y"] ** 2) for s in shots]  # x,y already in cm
        shot_coords = [ArrowShotCoord(x=s["x"], y=s["y"], score=s["score"], is_x=s["is_x"]) for s in shots]
        avg_r = float(np.mean(radii))
        std_s = float(np.std(scores))
        # Composite precision score: lower is more precise.
        # Combines group tightness (avg_radius) with scoring consistency (std_score).
        # Weighted 60/40 towards spatial tightness — the truer measure of shaft quality.
        precision_score = round(0.6 * avg_r + 0.4 * std_s, 4)
        arrows.append(
            ArrowPerformance(
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
                tier="",  # filled below
            )
        )

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
            arrow.tier = "primary"
            primary_set.append(arrow.arrow_number)
        elif arrow.precision_rank <= actual_group + (len(ranked) - actual_group) // 2:
            arrow.tier = "secondary"
        else:
            arrow.tier = "reserve"

    # Build tier summaries
    tiers: list[ArrowTier] = []
    for tier_name, tier_label in [("primary", "Primary Set"), ("secondary", "Secondary"), ("reserve", "Reserve")]:
        tier_arrows = [a for a in ranked if a.tier == tier_name]
        if tier_arrows:
            tiers.append(
                ArrowTier(
                    name=tier_name,
                    label=tier_label,
                    arrow_numbers=[a.arrow_number for a in tier_arrows],
                    avg_precision_score=round(float(np.mean([a.precision_score for a in tier_arrows])), 3),
                    avg_score=round(float(np.mean([a.avg_score for a in tier_arrows])), 3),
                    avg_radius=round(float(np.mean([a.avg_radius for a in tier_arrows])), 3),
                )
            )

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
