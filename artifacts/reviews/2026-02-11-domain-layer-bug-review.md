# Review: Python Domain Layer — Bug & Edge-Case Audit

**Date**: 2026-02-11T00:00:00Z  
**Reviewer**: reviewer-agent  
**Verdict**: NEEDS_REVISION  

## Summary

Reviewed all 8 Python domain files (`src/models.py`, `scoring.py`, `physics.py`, `park_model.py`, `precision.py`, `analysis.py`, `crawls.py`, `rounds.py`, `db.py`) for runtime crashes, wrong results, and data-integrity issues. Found **6 actionable bugs**, 3 of which are crash-severity.

## Findings

| # | Severity | File | Line(s) | Issue | Trigger |
|---|----------|------|---------|-------|---------|
| 1 | **CRASH** | `src/park_model.py` | 97 | Division by zero: `sigma_known / (known_distance_m * 100.0)` when `known_distance_m = 0` | API call to `/api/analysis/predict-score` or `/api/analysis/virtual-coach` with distance 0. Also triggered by Park Model analytics when a Flint round (`distance_m=0`) is the short-distance input. |
| 2 | **CRASH** | `src/scoring.py` | 21 | `math.ceil(radius / 0.0)` → `OverflowError` (inf) or `ValueError` (NaN) when `face_size_cm = 0` | API call to `/api/scoring/ring?face_cm=0&x=1&y=1`. No validation rejects `face_cm=0`. |
| 3 | **WRONG-RESULT** | `src/rounds.py` | 85, 112 | Flint round `max_score=560` assumes 10 pts/arrow, but `get_flint_score()` returns max 5. Fallback `get_max_score()` also uses `arrow_count * 10` for Flint. All Flint score percentages are halved. | Any user viewing score % for a Flint session — `get_score_percentage()` divides by 560 instead of 280. |
| 4 | **CRASH** | `src/crawls.py` | 28 | `np.polyfit([], [], 0)` raises `LinAlgError` / `TypeError` when called with empty lists | POST to `/api/crawls/calculate` or `/api/crawls/predict` with `known_distances: [], known_crawls: []`. Pydantic allows `List[float]` to be empty. |
| 5 | **CRASH** | `src/crawls.py` | 28 | `np.polyfit` raises when `known_distances` and `known_crawls` have different lengths | POST to `/api/crawls/calculate` with e.g. `known_distances: [10, 20], known_crawls: [5]`. No length-match validation. |
| 6 | **EDGE-CASE** | `src/precision.py` | 485 | `np.average(t_arr, weights=w_arr)` raises `ZeroDivisionError` if all `session_count` values are 0 | Call `compute_multi_distance_profile` where every entry has `session_count: 0`. Not currently wired to an API route but is a public function. |

## Detailed Analysis

### 1 — `park_model.py:97` — Division by zero (CRASH)

```python
sigma_theta = sigma_known / (known_distance_m * 100.0)
```

**Root cause:** No guard on `known_distance_m <= 0`. The Flint round preset sets `distance_m = 0.0`, so if an analyst picks Flint as the short-distance round in the Park Model comparison, this crashes.

The same unguarded division appears in `analytics.py:588`:
```python
sigma_theta_rad = short_sigma / (short_dist * 100.0)
```

**Fix:** Add `if known_distance_m <= 0: return (0.0, sigma_known)` at the top of `predict_score_at_distance`, or raise a descriptive `ValueError`.

---

### 2 — `scoring.py:21` — Zero face size (CRASH)

```python
ring_width = face_size_cm / 20.0          # → 0.0
ring_index = math.ceil(radius_cm / ring_width)  # → ceil(inf) or ceil(NaN)
```

When `face_size_cm = 0`: any nonzero radius produces `inf`, and `math.ceil(inf)` raises `OverflowError`. Radius of exactly 0 produces `0.0 / 0.0 = NaN`, and `math.ceil(NaN)` raises `ValueError`.

**Fix:** Guard `if face_size_cm <= 0: return 0` (miss) at the top, or validate at the API layer.

---

### 3 — `rounds.py:85,112` — Flint max score 2× too high (WRONG-RESULT)

The preset declares:
```python
"Flint": RoundPreset(
    arrow_count=56,
    max_score=560,       # ← should be 280 (56 × 5)
    scoring_type="flint",
)
```

And the fallback in `get_max_score`:
```python
elif preset.scoring_type == "flint":
    return arrow_count * 10   # ← should be * 5
```

`get_flint_score()` returns a max of 5 per arrow, so every Flint percentage shown in the UI is exactly half the correct value.

**Fix:** Change `max_score=280` in the preset and `return arrow_count * 5` in the fallback.

---

### 4 & 5 — `crawls.py:28` — Empty / mismatched input arrays (CRASH)

```python
coefficients = np.polyfit(known_distances, known_crawls, degree)
```

- Empty lists → `numpy.linalg.LinAlgError` (SVD of empty matrix)
- Different lengths → `TypeError` from numpy

Both are reachable via the crawl API (`POST /api/crawls/calculate`) because the Pydantic schema accepts any `List[float]` without length constraints.

**Fix:** Add an early return or raise `ValueError` if `len(known_distances) < 1` or `len(known_distances) != len(known_crawls)`.

---

### 6 — `precision.py:485` — All-zero weights in weighted average (EDGE-CASE)

```python
mean_theta = float(np.average(t_arr, weights=w_arr))
```

`numpy.average` divides by `sum(weights)`. If every `session_count` is 0, this is a division by zero.

**Fix:** Guard with `if w_arr.sum() == 0: return ...` before the weighted average.

---

## Items Verified as NOT Bugs

| Concern | Why it's fine |
|-|-|
| `calculate_expected_score` returning negative | Impossible: sum of 10 values each in [0,1] ≤ 10, so `10 - sum ≥ 0`. |
| `calculate_sigma_from_score(10, ...)` | Returns 0.0 immediately (guarded). |
| `predict_score_at_distance` with `score ≥ 10` | sigma=0, theta=0, new_sigma=0 → returns 10.0. Correct. |
| `compute_rayleigh_sigma_with_ci` with n=1 | sigma=0, CI=[0,0]. Degenerate but no crash. Analytics guards `total_shots==0`. |
| `compute_confidence_ellipse` with n<3 | Guarded: returns zeros. |
| `compute_practice_consistency` with empty list | Handled via ternary `scores[0] if scores else 0.0`. |
| `compute_ewma` with empty list | Returns `{"ewma": [], ...}`. |
| `detect_fliers` Mahalanobis fallback | `diff @ cov_inv * diff` with `sum(axis=1)` is mathematically correct. Singular cov handled via try/except. |

## Test Evidence

Tests pass as of the last run (exit code 0). However, none of the existing tests exercise the crash paths identified above (zero distance, zero face size, empty crawl arrays, Flint score percentages).

## Follow-up Items

- [ ] **[severity:high]** Fix division-by-zero in `predict_score_at_distance` (`src/park_model.py:97`) — add distance > 0 guard
- [ ] **[severity:high]** Fix `get_ring_score` crash with `face_size_cm=0` (`src/scoring.py:21`) — add face_size > 0 guard
- [ ] **[severity:high]** Fix Flint `max_score` from 560→280, and fallback from `*10` → `*5` (`src/rounds.py:85,112`)
- [ ] **[severity:medium]** Add empty/mismatched array guard in `calculate_crawl_regression` (`src/crawls.py:28`)
- [ ] **[severity:medium]** Add validation in crawl API schemas (`api/routers/crawls.py`) for `len >= 1` and matching lengths
- [ ] **[severity:low]** Guard `compute_multi_distance_profile` against all-zero weights (`src/precision.py:485`)
- [ ] **[severity:medium]** Add regression tests for all 6 findings
