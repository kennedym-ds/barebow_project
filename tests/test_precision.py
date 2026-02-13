"""Tests for src/precision.py"""

import numpy as np

from src.precision import (
    compute_accuracy_precision_ratio,
    compute_confidence_ellipse,
    compute_drms,
    compute_equipment_comparison,
    compute_ewma,
    compute_extreme_spread,
    compute_hit_probability,
    compute_multi_distance_profile,
    compute_practice_consistency,
    compute_r95,
    compute_rayleigh_sigma_with_ci,
    compute_within_end_trend,
    detect_fliers,
)

# Test data: clustered shots near center
TIGHT_XS = np.array([0.5, -0.3, 0.2, -0.1, 0.4, -0.2, 0.3, 0.0, -0.4, 0.1])
TIGHT_YS = np.array([0.3, -0.2, 0.1, 0.4, -0.1, 0.2, -0.3, 0.0, 0.1, -0.2])

# Spread shots
WIDE_XS = np.array([5.0, -4.0, 3.0, -2.0, 6.0, -5.0, 4.0, -3.0, 2.0, -1.0])
WIDE_YS = np.array([4.0, -3.0, 5.0, -4.0, 3.0, -2.0, 1.0, -5.0, 2.0, -1.0])


class TestDRMS:
    def test_tight_group(self):
        result = compute_drms(TIGHT_XS, TIGHT_YS)
        assert 0 < result < 0.5  # should be small

    def test_wide_group(self):
        result = compute_drms(WIDE_XS, WIDE_YS)
        assert result > 3.0  # should be large


class TestR95:
    def test_r95_tight(self):
        result = compute_r95(TIGHT_XS, TIGHT_YS)
        assert result > 0
        assert result < 1.0

    def test_r95_greater_than_drms(self):
        drms = compute_drms(TIGHT_XS, TIGHT_YS)
        r95 = compute_r95(TIGHT_XS, TIGHT_YS)
        assert r95 > drms  # R95 should be larger than DRMS


class TestExtremeSpread:
    def test_extreme_spread(self):
        result = compute_extreme_spread(TIGHT_XS, TIGHT_YS)
        assert result > 0
        # Max distance in tight group
        assert result < 2.0

    def test_single_shot(self):
        assert compute_extreme_spread(np.array([1.0]), np.array([1.0])) == 0.0


class TestRayleighCI:
    def test_ci_structure(self):
        result = compute_rayleigh_sigma_with_ci(TIGHT_XS, TIGHT_YS)
        assert result["ci_lower"] < result["sigma"] < result["ci_upper"]
        assert result["confidence"] == 0.95

    def test_ci_wider_with_fewer_shots(self):
        few = compute_rayleigh_sigma_with_ci(TIGHT_XS[:5], TIGHT_YS[:5])
        many = compute_rayleigh_sigma_with_ci(TIGHT_XS, TIGHT_YS)
        # CI width should be wider with fewer shots
        few_width = few["ci_upper"] - few["ci_lower"]
        many_width = many["ci_upper"] - many["ci_lower"]
        assert few_width > many_width


class TestAccuracyPrecision:
    def test_centered_group(self):
        # Centered group: mostly precision error
        centered_x = TIGHT_XS - np.mean(TIGHT_XS)
        centered_y = TIGHT_YS - np.mean(TIGHT_YS)
        result = compute_accuracy_precision_ratio(centered_x, centered_y)
        assert result["precision_pct"] > 90  # nearly all precision

    def test_offset_group(self):
        # Shift tight group far off-center: mostly accuracy error
        shifted_x = TIGHT_XS + 10.0
        shifted_y = TIGHT_YS + 10.0
        result = compute_accuracy_precision_ratio(shifted_x, shifted_y)
        assert result["accuracy_pct"] > 90  # nearly all accuracy


class TestConsistency:
    def test_consistent_scores(self):
        result = compute_practice_consistency([500, 505, 498, 502, 501])
        assert result["cv"] < 2.0

    def test_inconsistent_scores(self):
        result = compute_practice_consistency([300, 500, 350, 480, 320])
        assert result["cv"] > 15.0

    def test_single_score(self):
        result = compute_practice_consistency([500])
        assert result["cv"] == 0.0


class TestEWMA:
    def test_ewma_length(self):
        result = compute_ewma([8.0, 7.5, 8.2, 7.8, 8.5, 8.1, 8.3])
        assert len(result["ewma"]) == 7
        assert len(result["ucl"]) == 7
        assert len(result["lcl"]) == 7

    def test_ucl_above_lcl(self):
        result = compute_ewma([8.0, 7.5, 8.2, 7.8, 8.5])
        for upper, lower in zip(result["ucl"], result["lcl"], strict=True):
            assert upper > lower


class TestWithinEndTrend:
    def test_declining_trend(self):
        data = {0: [9, 9, 8, 9], 1: [8, 8, 7, 8], 2: [7, 6, 7, 7]}
        result = compute_within_end_trend(data)
        assert result["best_position"] == 1
        assert result["worst_position"] == 3

    def test_empty(self):
        result = compute_within_end_trend({})
        assert result["positions"] == []


class TestConfidenceEllipse:
    def test_ellipse_structure(self):
        result = compute_confidence_ellipse(TIGHT_XS, TIGHT_YS)
        assert result["semi_major"] > 0
        assert result["semi_minor"] > 0
        assert result["semi_major"] >= result["semi_minor"]

    def test_few_shots(self):
        result = compute_confidence_ellipse(np.array([1, 2]), np.array([1, 2]))
        assert result["semi_major"] == 0.0


class TestFlierDetection:
    def test_with_clear_flier(self):
        xs = np.concatenate([TIGHT_XS, np.array([20.0])])
        ys = np.concatenate([TIGHT_YS, np.array([20.0])])
        result = detect_fliers(xs, ys)
        assert result["flier_count"] >= 1
        assert result["clean_sigma"] < result["full_sigma"]

    def test_no_fliers(self):
        result = detect_fliers(TIGHT_XS, TIGHT_YS)
        assert result["flier_count"] == 0


class TestHitProbability:
    def test_tight_group_center(self):
        result = compute_hit_probability(1.0, 1.0, 0.0, 0.0, 40)
        # Tight group at center should have high X/10 probability
        assert result["ring_probs"][0]["ring"] == 10
        assert result["ring_probs"][0]["probability"] > 10
        assert 0 < result["expected_score"] <= 10

    def test_probabilities_sum_to_100(self):
        result = compute_hit_probability(3.0, 3.0, 0.0, 0.0, 40)
        total = sum(rp["probability"] for rp in result["ring_probs"])
        assert abs(total - 100) < 1  # close to 100


class TestMultiDistance:
    def test_consistent_skill(self):
        data = [
            {"distance_m": 18, "sigma_cm": 1.8, "session_count": 5, "round_type": "WA 18m"},
            {"distance_m": 50, "sigma_cm": 5.0, "session_count": 3, "round_type": "WA 50m"},
        ]
        result = compute_multi_distance_profile(data)
        assert len(result["distances"]) == 2
        assert result["mean_sigma_theta_mrad"] > 0

    def test_single_distance(self):
        data = [{"distance_m": 18, "sigma_cm": 1.8, "session_count": 5, "round_type": "WA 18m"}]
        result = compute_multi_distance_profile(data)
        assert result["interpretation"] == "Need data at ≥2 distances"


class TestEquipmentComparison:
    def test_clear_difference(self):
        a_scores = [8.5, 8.6, 8.4, 8.5, 8.7]
        b_scores = [7.0, 7.1, 6.9, 7.0, 7.2]
        result = compute_equipment_comparison(a_scores, [2.0] * 5, "Setup A", b_scores, [3.0] * 5, "Setup B")
        assert result["score_significant"] is True
        assert result["score_diff"] > 0

    def test_no_difference(self):
        scores = [8.0, 8.1, 7.9, 8.0, 8.2]
        result = compute_equipment_comparison(scores, [2.5] * 5, "Setup A", scores, [2.5] * 5, "Setup B")
        assert result["score_significant"] is False

    def test_insufficient_data(self):
        result = compute_equipment_comparison([8.0], [2.0], "A", [7.0], [3.0], "B")
        assert "Need ≥2" in result["interpretation"]
