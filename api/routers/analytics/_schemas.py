from datetime import datetime

from pydantic import BaseModel


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
    bow_name: str | None = None
    arrow_name: str | None = None


class ShotDetail(BaseModel):
    """Individual shot with session context."""

    session_id: str
    session_date: datetime
    round_type: str
    end_number: int
    arrow_number: int | None = None
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
    preset_arrow_count: int | None = None  # expected arrow count from preset
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
    end_scores: list[EndScore]
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
    dates: list[str]
    round_types: list[str]
    scores: list[float]  # avg arrow score per session
    sigmas: list[float]  # sigma_r per session
    # EWMA
    score_ewma: list[float]
    score_ucl: list[float]
    score_lcl: list[float]
    sigma_ewma: list[float]
    sigma_ucl: list[float]
    sigma_lcl: list[float]
    # Consistency per round type
    consistency: list[ConsistencyByRound]


class ShotPosition(BaseModel):
    """Shot position within end."""

    position: int  # 1-indexed
    avg_score: float
    count: int


class WithinEndAnalysis(BaseModel):
    """Within-end shot position analysis."""

    positions: list[ShotPosition]
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
    ring_probs: list[RingProbability]
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
    days_since_last_practice: int | None = None
    last_session_score: int | None = None
    last_session_round: str | None = None
    last_session_date: str | None = None
    rolling_avg_score: float | None = None
    personal_best_score: int | None = None
    personal_best_round: str | None = None
    personal_best_date: str | None = None
    sparkline_dates: list[str]
    sparkline_scores: list[float]


class ScoreGoalSimulation(BaseModel):
    """Result of a score-goal simulation."""

    goal_total_score: int
    goal_avg_arrow: float
    required_sigma_cm: float
    current_sigma_cm: float | None = None
    current_avg_arrow: float | None = None
    sigma_improvement_pct: float | None = None  # how much tighter groups need to be
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
    shots: list[ArrowShotCoord]
    precision_score: float  # composite metric (lower = more precise)
    precision_rank: int  # 1 = best precision
    tier: str  # 'primary', 'secondary', or 'reserve'


class ArrowTier(BaseModel):
    """A group of arrows with similar precision."""

    name: str  # 'primary', 'secondary', 'reserve'
    label: str  # 'Primary Set', 'Secondary', 'Reserve'
    arrow_numbers: list[int]
    avg_precision_score: float
    avg_score: float
    avg_radius: float


class ArrowPerformanceSummary(BaseModel):
    """Arrow performance across the quiver."""

    arrows: list[ArrowPerformance]
    best_arrow: int | None = None
    worst_arrow: int | None = None
    total_shots_with_number: int
    total_shots_without_number: int
    interpretation: str
    face_cm: int
    tiers: list[ArrowTier]
    primary_set: list[int]  # recommended competition arrows
    group_size: int  # how many in primary set
