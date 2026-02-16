"""
Arrow shaft analytics: quality grading, group statistics, outlier detection,
set optimization, and similarity matching.

All functions are pure — no database or web dependencies.
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Grade thresholds  (configurable defaults)
# ---------------------------------------------------------------------------

GRADE_THRESHOLDS: list[tuple[str, float, float]] = [
    #            (grade,         max_weight_dev_gr, max_straightness)
    ("Premium",      0.5, 0.001),
    ("Competition",  1.0, 0.003),
    ("Amateur",      2.0, 0.006),
]

FALLBACK_GRADE = "Recreational"


# ---------------------------------------------------------------------------
# Shaft quality grading
# ---------------------------------------------------------------------------


def grade_shaft(
    shaft_weight: float,
    mean_weight: float,
    straightness: float | None,
) -> str:
    """Grade a single shaft based on weight deviation from set mean and straightness.

    Rules (evaluated in order, first match wins):
    - Premium:     weight dev < 0.5 gr **and** straightness < 0.001
    - Competition: weight dev < 1.0 gr **and** straightness < 0.003
    - Amateur:     weight dev < 2.0 gr **and** straightness < 0.006
    - Recreational: everything else

    When *straightness* is ``None`` the shaft is graded on weight alone.
    """
    weight_dev = abs(shaft_weight - mean_weight)

    for grade, max_dev, max_straight in GRADE_THRESHOLDS:
        weight_ok = weight_dev < max_dev
        straight_ok = straightness is None or straightness < max_straight
        if weight_ok and straight_ok:
            return grade

    return FALLBACK_GRADE


# ---------------------------------------------------------------------------
# Group statistics
# ---------------------------------------------------------------------------


def _metric_stats(values: list[float]) -> dict | None:
    """Return {mean, std, range, cv_pct} for a list of floats, or None if empty."""
    if not values:
        return None
    n = len(values)
    mean = sum(values) / n
    if n < 2:
        return {"mean": round(mean, 3), "std": 0.0, "range": 0.0, "cv_pct": 0.0}
    variance = sum((v - mean) ** 2 for v in values) / (n - 1)
    std = variance ** 0.5
    val_range = max(values) - min(values)
    cv_pct = (std / mean * 100) if mean != 0 else 0.0
    return {
        "mean": round(mean, 3),
        "std": round(std, 3),
        "range": round(val_range, 3),
        "cv_pct": round(cv_pct, 2),
    }


def compute_group_stats(shafts: list[dict]) -> dict:
    """Compute group-level statistics for a list of shaft dicts.

    Each dict should have keys: ``measured_weight_gr``, ``measured_spine_astm``,
    ``straightness`` — any may be ``None`` and will be skipped.

    Returns::

        {
            "weight":       MetricStats | None,
            "spine":        MetricStats | None,
            "straightness": MetricStats | None,
            "shaft_count":  int,
        }
    """
    weights = [s["measured_weight_gr"] for s in shafts if s.get("measured_weight_gr") is not None]
    spines = [s["measured_spine_astm"] for s in shafts if s.get("measured_spine_astm") is not None]
    straights = [s["straightness"] for s in shafts if s.get("straightness") is not None]

    return {
        "weight": _metric_stats(weights),
        "spine": _metric_stats(spines),
        "straightness": _metric_stats(straights),
        "shaft_count": len(shafts),
    }


# ---------------------------------------------------------------------------
# Outlier detection  (Phase 2 — placeholder)
# ---------------------------------------------------------------------------


def detect_outliers(
    shafts: list[dict],
    threshold: float = 2.0,
) -> list[dict]:
    """Z-score outlier detection across weight, spine, and straightness.

    Returns a list of ``{arrow_number, feature, z_score, reason}`` entries.
    Requires >= 3 shafts with data for a given feature; otherwise skips that feature.
    """
    if len(shafts) < 3:
        return []

    results: list[dict] = []
    features = [
        ("weight", "measured_weight_gr", "gr"),
        ("spine", "measured_spine_astm", ""),
        ("straightness", "straightness", ""),
    ]

    for feature_name, key, unit in features:
        values = [(s, s.get(key)) for s in shafts if s.get(key) is not None]
        if len(values) < 3:
            continue

        vals = [v for _, v in values]
        n = len(vals)
        mean = sum(vals) / n
        std = (sum((v - mean) ** 2 for v in vals) / (n - 1)) ** 0.5
        if std == 0:
            continue

        for shaft, val in values:
            z = abs(val - mean) / std
            if z >= threshold:
                direction = "above" if val > mean else "below"
                suffix = f" {unit}" if unit else ""
                reason = (
                    f"{feature_name.capitalize()} {z:.1f}σ {direction} mean "
                    f"({val}{suffix} vs {mean:.1f}{suffix} mean)"
                )
                results.append({
                    "arrow_number": shaft.get("arrow_number", 0),
                    "feature": feature_name,
                    "value": val,
                    "z_score": round(z, 2),
                    "reason": reason,
                })

    return results


# ---------------------------------------------------------------------------
# Set consistency scoring & best-set finder  (Phase 5)
# ---------------------------------------------------------------------------

DEFAULT_WEIGHTS = {"weight": 0.4, "spine": 0.35, "straightness": 0.25}


def score_set_consistency(
    shafts: list[dict],
    weights: dict | None = None,
) -> float:
    """Score a set of shafts by consistency. Lower = more consistent.

    Normalizes each feature's standard deviation by the feature range across
    the *provided* shafts (avoids requiring global min/max from the full population).
    Score = weighted sum of normalised stds.

    Returns 0.0 for sets with fewer than 2 shafts.
    """
    if len(shafts) < 2:
        return 0.0

    w = weights or DEFAULT_WEIGHTS
    features = [
        ("weight", "measured_weight_gr"),
        ("spine", "measured_spine_astm"),
        ("straightness", "straightness"),
    ]

    score = 0.0
    for feat_name, key in features:
        vals = [s[key] for s in shafts if s.get(key) is not None]
        if len(vals) < 2:
            continue
        mean = sum(vals) / len(vals)
        std = (sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5
        # Normalise by mean (CV) to make features comparable
        if mean != 0:
            norm_std = std / abs(mean)
        else:
            norm_std = std
        score += w.get(feat_name, 0) * norm_std

    return round(score, 6)


def find_best_sets(
    shafts: list[dict],
    set_size: int = 6,
    top_n: int = 5,
    weights: dict | None = None,
    max_combinations: int = 200_000,
) -> list[dict]:
    """Find the top N most consistent sets of ``set_size`` arrows.

    Uses ``itertools.combinations`` for small N; switches to random sampling
    when the number of combinations exceeds ``max_combinations``.

    Returns a list of dicts ranked by consistency (best first).
    """
    import itertools
    import math
    import random

    n = len(shafts)
    if n < set_size:
        return []

    total_combos = math.comb(n, set_size)

    if total_combos <= max_combinations:
        # Exhaustive search
        candidates = list(itertools.combinations(range(n), set_size))
    else:
        # Random sampling — use index tuples to avoid duplicates
        seen: set[tuple[int, ...]] = set()
        while len(seen) < max_combinations:
            combo = tuple(sorted(random.sample(range(n), set_size)))
            seen.add(combo)
        candidates = list(seen)

    scored: list[tuple[float, tuple[int, ...]]] = []
    for combo in candidates:
        subset = [shafts[i] for i in combo]
        s = score_set_consistency(subset, weights)
        scored.append((s, combo))

    scored.sort(key=lambda x: x[0])

    results: list[dict] = []
    w = weights or DEFAULT_WEIGHTS
    for rank, (consistency, combo) in enumerate(scored[:top_n], start=1):
        subset = [shafts[i] for i in combo]
        arrow_numbers = [s.get("arrow_number", 0) for s in subset]

        # Per-feature stds for the result
        weight_vals = [s["measured_weight_gr"] for s in subset if s.get("measured_weight_gr") is not None]
        spine_vals = [s["measured_spine_astm"] for s in subset if s.get("measured_spine_astm") is not None]
        straight_vals = [s["straightness"] for s in subset if s.get("straightness") is not None]

        def _std(vals: list[float]) -> float:
            if len(vals) < 2:
                return 0.0
            m = sum(vals) / len(vals)
            return round((sum((v - m) ** 2 for v in vals) / len(vals)) ** 0.5, 4)

        results.append({
            "rank": rank,
            "arrow_numbers": sorted(arrow_numbers),
            "consistency_score": consistency,
            "weight_std_gr": _std(weight_vals),
            "spine_std": _std(spine_vals),
            "straightness_std": _std(straight_vals),
        })

    return results


def find_similar_arrows(
    reference_arrows: list[dict],
    candidates: list[dict],
    top_n: int = 5,
) -> list[dict]:
    """Find arrows most similar to a reference set's centroid.

    1. Compute centroid of reference set in [weight, spine, straightness] space
    2. Normalize all features to [0, 1] using min/max from combined pool
    3. Rank candidates by Euclidean distance from centroid

    Returns a list of dicts sorted by similarity (best first), each with:
        - arrow_number, similarity_score (0-100), weight_diff_gr,
          spine_diff, straightness_diff
    """
    if not reference_arrows or not candidates:
        return []

    features = ("measured_weight_gr", "measured_spine_astm", "straightness")

    # Compute centroid of reference set
    centroid: dict[str, float] = {}
    for feat in features:
        vals = [a[feat] for a in reference_arrows if a.get(feat) is not None]
        centroid[feat] = sum(vals) / len(vals) if vals else 0.0

    # Collect all values (reference + candidates) for normalisation
    all_arrows = reference_arrows + candidates
    ranges: dict[str, tuple[float, float]] = {}
    for feat in features:
        vals = [a[feat] for a in all_arrows if a.get(feat) is not None]
        if vals:
            lo, hi = min(vals), max(vals)
            ranges[feat] = (lo, hi)
        else:
            ranges[feat] = (0.0, 1.0)

    def _normalize(value: float, feat: str) -> float:
        lo, hi = ranges[feat]
        return (value - lo) / (hi - lo) if hi != lo else 0.5

    centroid_norm = {f: _normalize(centroid[f], f) for f in features}

    # Rank candidates
    scored: list[tuple[float, dict]] = []
    for arrow in candidates:
        vals_norm = {}
        raw_vals: dict[str, float] = {}
        skip = False
        for feat in features:
            v = arrow.get(feat)
            if v is None:
                skip = True
                break
            vals_norm[feat] = _normalize(v, feat)
            raw_vals[feat] = v
        if skip:
            continue

        dist = sum((vals_norm[f] - centroid_norm[f]) ** 2 for f in features) ** 0.5
        # Convert distance to 0-100 similarity.  max possible dist = sqrt(3) ~ 1.732
        max_dist = len(features) ** 0.5
        similarity = max(0.0, (1.0 - dist / max_dist) * 100.0)

        scored.append((similarity, {
            "arrow_number": arrow.get("arrow_number", 0),
            "similarity_score": round(similarity, 1),
            "weight_diff_gr": round(raw_vals["measured_weight_gr"] - centroid["measured_weight_gr"], 2),
            "spine_diff": round(raw_vals["measured_spine_astm"] - centroid["measured_spine_astm"], 2),
            "straightness_diff": round(raw_vals["straightness"] - centroid["straightness"], 4),
        }))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [entry for _, entry in scored[:top_n]]
