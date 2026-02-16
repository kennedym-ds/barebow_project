"""Tests for src/arrow_analytics — shaft quality grading, group statistics, outlier detection, optimization, similarity."""

from src.arrow_analytics import compute_group_stats, detect_outliers, find_best_sets, find_similar_arrows, grade_shaft, score_set_consistency


# ---------------------------------------------------------------------------
# grade_shaft
# ---------------------------------------------------------------------------


class TestGradeShaft:
    def test_grade_premium(self):
        assert grade_shaft(350.3, 350.0, 0.0005) == "Premium"

    def test_grade_competition(self):
        assert grade_shaft(350.8, 350.0, 0.002) == "Competition"

    def test_grade_amateur(self):
        assert grade_shaft(351.5, 350.0, 0.005) == "Amateur"

    def test_grade_recreational(self):
        assert grade_shaft(355.0, 350.0, 0.01) == "Recreational"

    def test_grade_none_straightness_uses_weight_only(self):
        """When straightness is None, grade by weight alone."""
        assert grade_shaft(350.3, 350.0, None) == "Premium"
        assert grade_shaft(351.5, 350.0, None) == "Amateur"

    def test_grade_weight_ok_straightness_bad(self):
        """Good weight but bad straightness → downgrade."""
        assert grade_shaft(350.1, 350.0, 0.01) == "Recreational"

    def test_grade_boundary_below(self):
        """Values just under threshold stay in higher grade."""
        assert grade_shaft(350.49, 350.0, 0.0009) == "Premium"

    def test_grade_boundary_at(self):
        """Values at threshold fall to next grade (strict less-than)."""
        assert grade_shaft(350.5, 350.0, 0.001) == "Competition"


# ---------------------------------------------------------------------------
# compute_group_stats
# ---------------------------------------------------------------------------


class TestComputeGroupStats:
    def test_basic_stats(self):
        shafts = [
            {"arrow_number": 1, "measured_weight_gr": 350.0, "measured_spine_astm": 570, "straightness": 0.002},
            {"arrow_number": 2, "measured_weight_gr": 351.0, "measured_spine_astm": 572, "straightness": 0.003},
            {"arrow_number": 3, "measured_weight_gr": 349.0, "measured_spine_astm": 568, "straightness": 0.001},
        ]
        stats = compute_group_stats(shafts)

        assert stats["shaft_count"] == 3
        assert stats["weight"] is not None
        assert stats["weight"]["mean"] == 350.0
        assert stats["weight"]["std"] > 0
        assert stats["weight"]["range"] == 2.0
        assert stats["spine"] is not None
        assert stats["straightness"] is not None

    def test_empty_shafts(self):
        stats = compute_group_stats([])
        assert stats["shaft_count"] == 0
        assert stats["weight"] is None
        assert stats["spine"] is None
        assert stats["straightness"] is None

    def test_partial_none_values(self):
        shafts = [
            {"arrow_number": 1, "measured_weight_gr": 350.0, "measured_spine_astm": None, "straightness": None},
            {"arrow_number": 2, "measured_weight_gr": 351.0, "measured_spine_astm": None, "straightness": None},
        ]
        stats = compute_group_stats(shafts)
        assert stats["shaft_count"] == 2
        assert stats["weight"] is not None
        assert stats["spine"] is None
        assert stats["straightness"] is None

    def test_single_shaft(self):
        shafts = [{"arrow_number": 1, "measured_weight_gr": 350.0, "measured_spine_astm": 570, "straightness": 0.001}]
        stats = compute_group_stats(shafts)
        assert stats["weight"]["std"] == 0.0
        assert stats["weight"]["cv_pct"] == 0.0

    def test_cv_pct_nonzero(self):
        shafts = [
            {"arrow_number": i, "measured_weight_gr": 350.0 + i, "measured_spine_astm": 570, "straightness": 0.001}
            for i in range(6)
        ]
        stats = compute_group_stats(shafts)
        assert stats["weight"]["cv_pct"] > 0


# ---------------------------------------------------------------------------
# detect_outliers
# ---------------------------------------------------------------------------


class TestDetectOutliers:
    def _make_shafts(self, weights: list[float]) -> list[dict]:
        return [
            {"arrow_number": i + 1, "measured_weight_gr": w, "measured_spine_astm": 570, "straightness": 0.002}
            for i, w in enumerate(weights)
        ]

    def test_detect_weight_outlier(self):
        # 5 shafts at 350 gr, 1 at 360 gr — clear outlier
        shafts = self._make_shafts([350, 350, 350, 350, 350, 360])
        outliers = detect_outliers(shafts, threshold=2.0)
        assert len(outliers) >= 1
        weight_outliers = [o for o in outliers if o["feature"] == "weight"]
        assert any(o["arrow_number"] == 6 for o in weight_outliers)

    def test_detect_no_outliers(self):
        shafts = self._make_shafts([350, 350.5, 349.8, 350.2, 350.1, 349.9])
        outliers = detect_outliers(shafts, threshold=2.0)
        assert len(outliers) == 0

    def test_threshold_sensitivity(self):
        # Moderate outlier — caught at 1.5σ but not at 3.0σ
        shafts = self._make_shafts([350, 350, 350, 350, 350, 353])
        low = detect_outliers(shafts, threshold=1.5)
        high = detect_outliers(shafts, threshold=3.0)
        assert len(low) >= len(high)

    def test_insufficient_data(self):
        shafts = self._make_shafts([350, 360])
        assert detect_outliers(shafts) == []

    def test_multiple_features(self):
        shafts = [
            {"arrow_number": 1, "measured_weight_gr": 350, "measured_spine_astm": 570, "straightness": 0.002},
            {"arrow_number": 2, "measured_weight_gr": 350, "measured_spine_astm": 570, "straightness": 0.002},
            {"arrow_number": 3, "measured_weight_gr": 350, "measured_spine_astm": 570, "straightness": 0.002},
            {"arrow_number": 4, "measured_weight_gr": 370, "measured_spine_astm": 600, "straightness": 0.002},
        ]
        outliers = detect_outliers(shafts, threshold=1.5)
        features = {o["feature"] for o in outliers if o["arrow_number"] == 4}
        assert "weight" in features
        assert "spine" in features


# ---------------------------------------------------------------------------
# score_set_consistency
# ---------------------------------------------------------------------------


class TestScoreSetConsistency:
    def _make_shafts(self, weights: list[float], spine: float = 570, straight: float = 0.002) -> list[dict]:
        return [
            {"arrow_number": i + 1, "measured_weight_gr": w, "measured_spine_astm": spine, "straightness": straight}
            for i, w in enumerate(weights)
        ]

    def test_perfect_set(self):
        """All identical shafts → score 0."""
        shafts = self._make_shafts([350, 350, 350, 350, 350, 350])
        assert score_set_consistency(shafts) == 0.0

    def test_worse_set_higher_score(self):
        uniform = self._make_shafts([350, 350, 350, 350, 350, 350])
        varied = self._make_shafts([340, 345, 350, 355, 360, 365])
        assert score_set_consistency(varied) > score_set_consistency(uniform)

    def test_single_shaft(self):
        shafts = self._make_shafts([350])
        assert score_set_consistency(shafts) == 0.0


# ---------------------------------------------------------------------------
# find_best_sets
# ---------------------------------------------------------------------------


class TestFindBestSets:
    def _make_shafts(self, n: int, base_weight: float = 350.0) -> list[dict]:
        return [
            {
                "arrow_number": i + 1,
                "measured_weight_gr": base_weight + (i * 0.5),
                "measured_spine_astm": 570,
                "straightness": 0.002,
            }
            for i in range(n)
        ]

    def test_trivial_exact_size(self):
        """6 shafts, set_size=6 → returns exactly 1 set."""
        shafts = self._make_shafts(6)
        results = find_best_sets(shafts, set_size=6)
        assert len(results) == 1
        assert results[0]["rank"] == 1
        assert sorted(results[0]["arrow_numbers"]) == [1, 2, 3, 4, 5, 6]

    def test_optimal_set_ranked_first(self):
        """8 shafts where first 6 are tightest → rank 1 picks them."""
        shafts = [
            {"arrow_number": i + 1, "measured_weight_gr": 350.0, "measured_spine_astm": 570, "straightness": 0.001}
            for i in range(6)
        ]
        # Add 2 outlier shafts
        shafts.append({"arrow_number": 7, "measured_weight_gr": 360.0, "measured_spine_astm": 580, "straightness": 0.005})
        shafts.append({"arrow_number": 8, "measured_weight_gr": 365.0, "measured_spine_astm": 590, "straightness": 0.008})

        results = find_best_sets(shafts, set_size=6)
        assert results[0]["rank"] == 1
        # Best set should exclude the outlier shafts
        assert 7 not in results[0]["arrow_numbers"]
        assert 8 not in results[0]["arrow_numbers"]

    def test_insufficient_shafts(self):
        shafts = self._make_shafts(4)
        results = find_best_sets(shafts, set_size=6)
        assert results == []

    def test_top_n_limit(self):
        shafts = self._make_shafts(10)
        results = find_best_sets(shafts, set_size=6, top_n=3)
        assert len(results) == 3
        assert [r["rank"] for r in results] == [1, 2, 3]

    def test_results_ranked_by_consistency(self):
        shafts = self._make_shafts(12)
        results = find_best_sets(shafts, set_size=6, top_n=5)
        scores = [r["consistency_score"] for r in results]
        assert scores == sorted(scores)  # ascending (lower = better)


# ---------------------------------------------------------------------------
# find_similar_arrows
# ---------------------------------------------------------------------------


class TestFindSimilarArrows:
    @staticmethod
    def _make_shaft(num: int, weight: float, spine: float, straight: float) -> dict:
        return {
            "arrow_number": num,
            "measured_weight_gr": weight,
            "measured_spine_astm": spine,
            "straightness": straight,
        }

    def test_identical_arrow_scores_100(self):
        ref = [self._make_shaft(1, 350.0, 500.0, 0.002)]
        cand = [self._make_shaft(2, 350.0, 500.0, 0.002)]
        results = find_similar_arrows(ref, cand, top_n=5)
        assert len(results) == 1
        assert results[0]["similarity_score"] == 100.0

    def test_ranking_closer_arrow_first(self):
        ref = [self._make_shaft(1, 350.0, 500.0, 0.002)]
        close = self._make_shaft(2, 350.5, 501.0, 0.002)
        far = self._make_shaft(3, 360.0, 520.0, 0.010)
        results = find_similar_arrows(ref, [close, far], top_n=5)
        assert results[0]["arrow_number"] == 2
        assert results[0]["similarity_score"] > results[1]["similarity_score"]

    def test_empty_candidates(self):
        ref = [self._make_shaft(1, 350.0, 500.0, 0.002)]
        assert find_similar_arrows(ref, [], top_n=5) == []

    def test_empty_reference(self):
        cand = [self._make_shaft(1, 350.0, 500.0, 0.002)]
        assert find_similar_arrows([], cand, top_n=5) == []

    def test_top_n_limits_results(self):
        ref = [self._make_shaft(1, 350.0, 500.0, 0.002)]
        candidates = [self._make_shaft(i, 350.0 + i, 500.0 + i, 0.002 + i * 0.001) for i in range(10)]
        results = find_similar_arrows(ref, candidates, top_n=3)
        assert len(results) == 3

    def test_result_fields(self):
        ref = [self._make_shaft(1, 350.0, 500.0, 0.002)]
        cand = [self._make_shaft(2, 351.0, 502.0, 0.003)]
        results = find_similar_arrows(ref, cand, top_n=5)
        r = results[0]
        assert "arrow_number" in r
        assert "similarity_score" in r
        assert "weight_diff_gr" in r
        assert "spine_diff" in r
        assert "straightness_diff" in r
