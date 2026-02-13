"""Advanced precision and statistical metrics for archery shot analysis."""

import math

import numpy as np
from scipy import stats as scipy_stats


def compute_drms(xs: np.ndarray, ys: np.ndarray) -> float:
    """Distance Root Mean Square — √(σ_x² + σ_y²). Contains ~63.2% of shots for circular normal."""
    var_x = np.var(xs, ddof=0)
    var_y = np.var(ys, ddof=0)
    return float(np.sqrt(var_x + var_y))


def compute_r95(xs: np.ndarray, ys: np.ndarray) -> float:
    """95th percentile radial error. Empirical percentile of radial distances."""
    cx, cy = np.mean(xs), np.mean(ys)
    radii = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
    return float(np.percentile(radii, 95))


def compute_extreme_spread(xs: np.ndarray, ys: np.ndarray) -> float:
    """Maximum pairwise distance between any two shots."""
    from scipy.spatial.distance import pdist

    if len(xs) < 2:
        return 0.0
    points = np.column_stack([xs, ys])
    return float(np.max(pdist(points)))


def compute_rayleigh_sigma_with_ci(xs: np.ndarray, ys: np.ndarray, confidence: float = 0.95) -> dict:
    """
    Rayleigh scale parameter σ_r with χ² confidence interval.

    Returns:
        sigma: point estimate
        ci_lower: lower bound of CI
        ci_upper: upper bound of CI
        confidence: confidence level used
    """
    cx, cy = np.mean(xs), np.mean(ys)
    r_sq = (xs - cx) ** 2 + (ys - cy) ** 2
    n = len(xs)
    # MLE estimate: σ² = sum(r²) / (2n)
    sigma_sq = float(np.sum(r_sq) / (2 * n))
    sigma = math.sqrt(sigma_sq)

    # CI via χ²(2n) distribution
    # 2n * σ² / σ_true² ~ χ²(2n)
    alpha = 1 - confidence
    chi2_lower = scipy_stats.chi2.ppf(alpha / 2, 2 * n)
    chi2_upper = scipy_stats.chi2.ppf(1 - alpha / 2, 2 * n)

    ci_lower = sigma * math.sqrt(2 * n / chi2_upper)
    ci_upper = sigma * math.sqrt(2 * n / chi2_lower)

    return {
        "sigma": round(sigma, 3),
        "ci_lower": round(ci_lower, 3),
        "ci_upper": round(ci_upper, 3),
        "confidence": confidence,
    }


def compute_accuracy_precision_ratio(xs: np.ndarray, ys: np.ndarray) -> dict:
    """
    ISO 5725 accuracy vs precision decomposition.
    Separates total error into trueness (systematic MPI offset) and precision (random spread).

    Returns:
        bias_sq: squared MPI offset (trueness error)
        variance: random spread around MPI
        total_mspe: bias_sq + variance
        accuracy_pct: percentage of error due to aim/bias
        precision_pct: percentage of error due to consistency
        interpretation: text description
    """
    mpi_x = float(np.mean(xs))
    mpi_y = float(np.mean(ys))
    bias_sq = mpi_x**2 + mpi_y**2

    variance = float(np.var(xs, ddof=0) + np.var(ys, ddof=0))
    total_mspe = bias_sq + variance

    if total_mspe < 0.001:
        return {
            "bias_sq": 0.0,
            "variance": 0.0,
            "total_mspe": 0.0,
            "accuracy_pct": 0.0,
            "precision_pct": 0.0,
            "interpretation": "Perfect — no error detected",
        }

    accuracy_pct = (bias_sq / total_mspe) * 100
    precision_pct = (variance / total_mspe) * 100

    if accuracy_pct > 60:
        interp = "Aim-dominant error — adjust crawl marks or sight picture"
    elif precision_pct > 60:
        interp = "Consistency-dominant error — focus on shot execution"
    else:
        interp = "Mixed error — both aim and consistency need attention"

    return {
        "bias_sq": round(bias_sq, 3),
        "variance": round(variance, 3),
        "total_mspe": round(total_mspe, 3),
        "accuracy_pct": round(accuracy_pct, 1),
        "precision_pct": round(precision_pct, 1),
        "interpretation": interp,
    }


def compute_practice_consistency(scores: list[float]) -> dict:
    """
    Coefficient of Variation (CV) of session scores.
    Lower = more reproducible performance.

    Args:
        scores: list of total session scores (or avg arrow scores)

    Returns:
        cv: coefficient of variation (%)
        mean: mean score
        std: standard deviation
        interpretation: text description
    """
    if len(scores) < 2:
        return {"cv": 0.0, "mean": scores[0] if scores else 0.0, "std": 0.0, "interpretation": "Need more sessions"}

    arr = np.array(scores, dtype=float)
    mean_val = float(np.mean(arr))
    std_val = float(np.std(arr, ddof=1))

    if mean_val < 0.001:
        return {"cv": 0.0, "mean": 0.0, "std": 0.0, "interpretation": "No data"}

    cv = (std_val / mean_val) * 100

    if cv < 3:
        interp = "Excellent consistency — very reproducible"
    elif cv < 6:
        interp = "Good consistency"
    elif cv < 10:
        interp = "Moderate variability"
    else:
        interp = "High variability — performance fluctuates significantly"

    return {
        "cv": round(cv, 2),
        "mean": round(mean_val, 2),
        "std": round(std_val, 2),
        "interpretation": interp,
    }


def compute_ewma(values: list[float], lam: float = 0.2) -> dict:
    """
    Exponentially Weighted Moving Average with control limits.

    Args:
        values: time-ordered measurements (scores or sigmas)
        lam: smoothing factor (0 < λ ≤ 1). 0.2 for scores, 0.3 for sigma.

    Returns:
        ewma: list of EWMA values
        ucl: list of upper control limits
        lcl: list of lower control limits
        mean: overall mean (μ₀)
        sigma: overall std dev
    """
    if len(values) < 2:
        return {"ewma": values, "ucl": values, "lcl": values, "mean": values[0] if values else 0.0, "sigma": 0.0}

    arr = np.array(values, dtype=float)
    mu = float(np.mean(arr))
    sigma = float(np.std(arr, ddof=1))

    L = 2.7  # control limit multiplier (≈ 3σ equivalent)

    ewma_vals = []
    ucl_vals = []
    lcl_vals = []

    ewma_t = mu  # start at overall mean
    for i, x in enumerate(arr):
        ewma_t = lam * x + (1 - lam) * ewma_t
        # Time-varying control limits
        factor = sigma * math.sqrt(lam / (2 - lam) * (1 - (1 - lam) ** (2 * (i + 1))))
        ewma_vals.append(round(ewma_t, 4))
        ucl_vals.append(round(mu + L * factor, 4))
        lcl_vals.append(round(mu - L * factor, 4))

    return {
        "ewma": ewma_vals,
        "ucl": ucl_vals,
        "lcl": lcl_vals,
        "mean": round(mu, 4),
        "sigma": round(sigma, 4),
    }


def compute_within_end_trend(shots_by_position: dict[int, list[float]]) -> dict:
    """
    Score as function of shot position within an end.

    Args:
        shots_by_position: {position_index: [scores]} where position_index is 0-based
            e.g., {0: [8,7,9,...], 1: [9,8,8,...], 2: [9,9,7,...]}

    Returns:
        positions: list of {position, avg_score, count}
        best_position: which shot position scores highest
        worst_position: which shot position scores lowest
        interpretation: text
    """
    if not shots_by_position:
        return {"positions": [], "best_position": 0, "worst_position": 0, "interpretation": "No data"}

    results = []
    for pos in sorted(shots_by_position.keys()):
        scores = shots_by_position[pos]
        results.append(
            {
                "position": pos + 1,  # 1-indexed for display
                "avg_score": round(float(np.mean(scores)), 3),
                "count": len(scores),
            }
        )

    if not results:
        return {"positions": [], "best_position": 0, "worst_position": 0, "interpretation": "No data"}

    best = max(results, key=lambda r: r["avg_score"])
    worst = min(results, key=lambda r: r["avg_score"])

    diff = best["avg_score"] - worst["avg_score"]
    if diff < 0.2:
        interp = "Consistent across all shot positions"
    elif worst["position"] == 1:
        interp = f"First arrow is weakest ({worst['avg_score']:.2f} avg). Consider a more deliberate pre-shot routine."
    elif worst["position"] == results[-1]["position"]:
        interp = (
            f"Last arrow is weakest ({worst['avg_score']:.2f} avg). May indicate rushing or fatigue within the end."
        )
    else:
        interp = f"Shot {worst['position']} is weakest ({worst['avg_score']:.2f} avg), shot {best['position']} is best ({best['avg_score']:.2f} avg)."

    return {
        "positions": results,
        "best_position": best["position"],
        "worst_position": worst["position"],
        "interpretation": interp,
    }


def compute_confidence_ellipse(xs: np.ndarray, ys: np.ndarray, coverage: float = 0.9) -> dict:
    """
    Confidence ellipse from 2x2 covariance matrix eigendecomposition.

    Returns:
        center_x, center_y: ellipse center
        semi_major: semi-major axis length
        semi_minor: semi-minor axis length
        angle_deg: rotation angle in degrees (0 = horizontal)
        coverage: coverage probability used
        correlation: x-y correlation coefficient
    """
    if len(xs) < 3:
        return {
            "center_x": float(np.mean(xs)),
            "center_y": float(np.mean(ys)),
            "semi_major": 0.0,
            "semi_minor": 0.0,
            "angle_deg": 0.0,
            "coverage": coverage,
            "correlation": 0.0,
        }

    cx, cy = float(np.mean(xs)), float(np.mean(ys))
    cov = np.cov(xs, ys)  # 2x2 covariance matrix
    eigenvalues, eigenvectors = np.linalg.eigh(cov)

    # Sort by eigenvalue descending
    order = eigenvalues.argsort()[::-1]
    eigenvalues = eigenvalues[order]
    eigenvectors = eigenvectors[:, order]

    # Scale factor for coverage probability (chi2 with 2 dof)
    chi2_val = scipy_stats.chi2.ppf(coverage, 2)

    semi_major = math.sqrt(eigenvalues[0] * chi2_val)
    semi_minor = math.sqrt(max(eigenvalues[1], 0) * chi2_val)

    # Angle of major axis
    angle_rad = math.atan2(eigenvectors[1, 0], eigenvectors[0, 0])
    angle_deg = math.degrees(angle_rad)

    # Correlation
    corr = float(np.corrcoef(xs, ys)[0, 1]) if np.std(xs) > 0 and np.std(ys) > 0 else 0.0

    return {
        "center_x": round(cx, 3),
        "center_y": round(cy, 3),
        "semi_major": round(semi_major, 3),
        "semi_minor": round(semi_minor, 3),
        "angle_deg": round(angle_deg, 2),
        "coverage": coverage,
        "correlation": round(corr, 4),
    }


def detect_fliers(xs: np.ndarray, ys: np.ndarray, threshold_sigma: float = 2.5) -> dict:
    """
    Statistical outlier detection using Mahalanobis distance.
    Uses robust covariance estimation when possible, falls back to standard.

    Returns:
        flier_indices: list of indices flagged as outliers
        flier_count: number of fliers
        flier_pct: percentage of shots that are fliers
        clean_sigma: sigma computed excluding fliers
        full_sigma: sigma with all shots
        interpretation: text
    """
    n = len(xs)
    if n < 5:
        full_drms = compute_drms(xs, ys)
        return {
            "flier_indices": [],
            "flier_count": 0,
            "flier_pct": 0.0,
            "clean_sigma": round(full_drms, 3),
            "full_sigma": round(full_drms, 3),
            "interpretation": "Too few shots for flier detection",
        }

    points = np.column_stack([xs, ys])
    mean = np.mean(points, axis=0)

    # Try robust covariance first
    try:
        from sklearn.covariance import MinCovDet

        mcd = MinCovDet().fit(points)
        mahal_dist = mcd.mahalanobis(points)
    except (ImportError, ValueError):
        # Fallback to standard Mahalanobis
        cov = np.cov(xs, ys)
        try:
            cov_inv = np.linalg.inv(cov)
            diff = points - mean
            mahal_dist = np.sum(diff @ cov_inv * diff, axis=1)
        except np.linalg.LinAlgError:
            full_drms = compute_drms(xs, ys)
            return {
                "flier_indices": [],
                "flier_count": 0,
                "flier_pct": 0.0,
                "clean_sigma": round(full_drms, 3),
                "full_sigma": round(full_drms, 3),
                "interpretation": "Cannot compute — singular covariance",
            }

    # Chi-squared threshold with 2 dof
    chi2_threshold = scipy_stats.chi2.ppf(0.975, 2)  # ~7.38

    flier_mask = mahal_dist > chi2_threshold
    flier_indices = list(np.where(flier_mask)[0])

    full_drms = compute_drms(xs, ys)
    if len(flier_indices) > 0 and len(flier_indices) < n - 2:
        clean_xs = xs[~flier_mask]
        clean_ys = ys[~flier_mask]
        clean_sigma = compute_drms(clean_xs, clean_ys)
    else:
        clean_sigma = full_drms

    flier_pct = len(flier_indices) / n * 100

    if flier_pct == 0:
        interp = "No statistical outliers detected"
    elif flier_pct < 5:
        interp = f"{len(flier_indices)} flier(s) detected — isolated execution errors"
    elif flier_pct < 15:
        interp = f"{len(flier_indices)} fliers ({flier_pct:.0f}%) — consider form consistency drills"
    else:
        interp = f"High flier rate ({flier_pct:.0f}%) — uniformly large group, not isolated errors"

    return {
        "flier_indices": [int(i) for i in flier_indices],
        "flier_count": len(flier_indices),
        "flier_pct": round(flier_pct, 1),
        "clean_sigma": round(clean_sigma, 3),
        "full_sigma": round(full_drms, 3),
        "interpretation": interp,
    }


def compute_hit_probability(sigma_x: float, sigma_y: float, mpi_x: float, mpi_y: float, face_size_cm: int) -> dict:
    """
    Estimated probability of hitting each scoring ring, based on bivariate normal.

    Returns:
        ring_probs: list of {ring, probability} from 10 down to miss
        expected_score: expected average arrow score
    """
    ring_width = face_size_cm / 20.0

    if sigma_x < 0.01:
        sigma_x = 0.01
    if sigma_y < 0.01:
        sigma_y = 0.01

    # Use 2D integration via radial approach
    # For each ring, compute P(shot lands in annulus)
    # With bivariate normal offset by MPI
    n_samples = 50000
    rng = np.random.default_rng(42)
    samples_x = rng.normal(mpi_x, sigma_x, n_samples)
    samples_y = rng.normal(mpi_y, sigma_y, n_samples)
    radii = np.sqrt(samples_x**2 + samples_y**2)

    ring_probs = []
    for ring_val in range(10, 0, -1):
        outer_r = (11 - ring_val) * ring_width
        inner_r = (10 - ring_val) * ring_width if ring_val < 10 else 0
        count = np.sum((radii >= inner_r) & (radii < outer_r))
        ring_probs.append(
            {
                "ring": ring_val,
                "probability": round(float(count / n_samples) * 100, 2),
            }
        )

    # Miss
    outer_r = 10 * ring_width
    miss_count = np.sum(radii >= outer_r)
    ring_probs.append(
        {
            "ring": 0,
            "probability": round(float(miss_count / n_samples) * 100, 2),
        }
    )

    # Expected score
    expected = sum(rp["ring"] * rp["probability"] / 100 for rp in ring_probs)

    return {
        "ring_probs": ring_probs,
        "expected_score": round(expected, 3),
    }


def compute_multi_distance_profile(distance_data: list[dict]) -> dict:
    """
    Compute angular deviation (σ_theta) across multiple distances.

    Args:
        distance_data: list of {"distance_m": float, "sigma_cm": float, "session_count": int, "round_type": str}

    Returns:
        distances: sorted distance data with σ_theta
        mean_sigma_theta: weighted average angular deviation
        distance_effect: is there significant distance-dependent degradation?
        interpretation: text
    """
    if len(distance_data) < 2:
        return {
            "distances": distance_data,
            "mean_sigma_theta": 0.0,
            "distance_effect": False,
            "interpretation": "Need data at ≥2 distances",
        }

    results = []
    thetas = []
    weights = []
    for d in sorted(distance_data, key=lambda x: x["distance_m"]):
        dist_cm = d["distance_m"] * 100
        theta_mrad = (d["sigma_cm"] / dist_cm) * 1000 if dist_cm > 0 else 0
        results.append(
            {
                **d,
                "sigma_theta_mrad": round(theta_mrad, 3),
            }
        )
        thetas.append(theta_mrad)
        weights.append(d["session_count"])

    # Weighted average
    w_arr = np.array(weights, dtype=float)
    t_arr = np.array(thetas)
    mean_theta = float(np.average(t_arr, weights=w_arr))

    # Check for distance effect: is theta significantly higher at long distance?
    if len(thetas) >= 3:
        # Linear regression of theta vs distance
        distances = np.array([r["distance_m"] for r in results])
        slope, intercept, r_value, p_value, std_err = scipy_stats.linregress(distances, t_arr)
        distance_effect = p_value < 0.1 and slope > 0
        if distance_effect:
            interp = f"Distance-dependent degradation detected (slope={slope:.4f} mrad/m, p={p_value:.3f}). Equipment drag or tuning may limit long-distance performance."
        else:
            interp = f"Consistent angular precision across distances (mean σ_θ = {mean_theta:.2f} mrad)."
    else:
        # Just 2 distances: simple comparison
        if len(thetas) == 2 and thetas[1] > thetas[0] * 1.2:
            distance_effect = True
            interp = f"Angular deviation increases at longer distance ({thetas[0]:.2f} → {thetas[1]:.2f} mrad). Possible equipment drag or tuning issue."
        else:
            distance_effect = False
            interp = f"Similar angular precision across distances (mean σ_θ = {mean_theta:.2f} mrad)."

    return {
        "distances": results,
        "mean_sigma_theta_mrad": round(mean_theta, 3),
        "distance_effect": distance_effect,
        "interpretation": interp,
    }


def compute_equipment_comparison(
    setup_a_scores: list[float],
    setup_a_sigmas: list[float],
    setup_a_name: str,
    setup_b_scores: list[float],
    setup_b_sigmas: list[float],
    setup_b_name: str,
) -> dict:
    """
    Statistical comparison of two equipment setups using Welch's t-test.

    Returns:
        score_diff: mean score difference (A - B)
        score_p_value: p-value for score difference
        score_cohens_d: effect size
        sigma_diff: mean sigma difference (A - B, negative = A is tighter)
        sigma_p_value: p-value for sigma difference
        interpretation: text
    """
    if len(setup_a_scores) < 2 or len(setup_b_scores) < 2:
        return {
            "setup_a": setup_a_name,
            "setup_b": setup_b_name,
            "score_diff": 0.0,
            "score_p_value": 1.0,
            "score_cohens_d": 0.0,
            "sigma_diff": 0.0,
            "sigma_p_value": 1.0,
            "score_significant": False,
            "sigma_significant": False,
            "interpretation": "Need ≥2 sessions with each setup for comparison",
        }

    a_scores = np.array(setup_a_scores)
    b_scores = np.array(setup_b_scores)

    # Welch's t-test on scores
    t_stat, p_score = scipy_stats.ttest_ind(a_scores, b_scores, equal_var=False)
    score_diff = float(np.mean(a_scores) - np.mean(b_scores))

    # Cohen's d
    pooled_std = math.sqrt((np.var(a_scores, ddof=1) + np.var(b_scores, ddof=1)) / 2)
    cohens_d = score_diff / pooled_std if pooled_std > 0.001 else 0.0

    # Sigma comparison
    a_sig = np.array(setup_a_sigmas)
    b_sig = np.array(setup_b_sigmas)
    _, p_sigma = (
        scipy_stats.ttest_ind(a_sig, b_sig, equal_var=False)
        if len(setup_a_sigmas) >= 2 and len(setup_b_sigmas) >= 2
        else (0, 1.0)
    )
    sigma_diff = float(np.mean(a_sig) - np.mean(b_sig))

    score_sig = bool(p_score < 0.05)
    sigma_sig = bool(p_sigma < 0.05)

    if score_sig and score_diff > 0:
        interp = f"{setup_a_name} scores significantly higher than {setup_b_name} (p={p_score:.3f}, d={cohens_d:.2f})"
    elif score_sig and score_diff < 0:
        interp = (
            f"{setup_b_name} scores significantly higher than {setup_a_name} (p={p_score:.3f}, d={abs(cohens_d):.2f})"
        )
    else:
        interp = f"No significant scoring difference between {setup_a_name} and {setup_b_name} (p={p_score:.3f})"

    if sigma_sig:
        better = setup_a_name if sigma_diff < 0 else setup_b_name
        interp += f". {better} produces tighter groups (p={p_sigma:.3f})."

    return {
        "setup_a": setup_a_name,
        "setup_b": setup_b_name,
        "score_diff": round(score_diff, 3),
        "score_p_value": round(float(p_score), 4),
        "score_cohens_d": round(cohens_d, 3),
        "sigma_diff": round(sigma_diff, 3),
        "sigma_p_value": round(float(p_sigma), 4),
        "score_significant": score_sig,
        "sigma_significant": sigma_sig,
        "interpretation": interp,
    }
