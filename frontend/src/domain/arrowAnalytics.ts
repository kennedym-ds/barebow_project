/**
 * Arrow shaft analytics: quality grading, group statistics, outlier detection,
 * set optimization, and similarity matching.
 * Ported from src/arrow_analytics.py — pure math, no external dependencies.
 */

// ---------------------------------------------------------------------------
// Grade thresholds
// ---------------------------------------------------------------------------

const GRADE_THRESHOLDS: Array<[string, number, number]> = [
  // [grade, max_weight_dev_gr, max_straightness]
  ["Premium", 0.5, 0.001],
  ["Competition", 1.0, 0.003],
  ["Amateur", 2.0, 0.006],
];

const FALLBACK_GRADE = "Recreational";

// ---------------------------------------------------------------------------
// Shaft quality grading
// ---------------------------------------------------------------------------

/**
 * Grade a single shaft based on weight deviation from set mean and straightness.
 */
export function gradeShaft(
  shaftWeight: number,
  meanWeight: number,
  straightness: number | null,
): string {
  const weightDev = Math.abs(shaftWeight - meanWeight);

  for (const [grade, maxDev, maxStraight] of GRADE_THRESHOLDS) {
    const weightOk = weightDev < maxDev;
    const straightOk = straightness === null || straightness < maxStraight;
    if (weightOk && straightOk) return grade;
  }

  return FALLBACK_GRADE;
}

// ---------------------------------------------------------------------------
// Group statistics
// ---------------------------------------------------------------------------

export interface MetricStats {
  mean: number;
  std: number;
  range: number;
  cv_pct: number;
}

function metricStats(values: number[]): MetricStats | null {
  if (values.length === 0) return null;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean: Math.round(mean * 1000) / 1000, std: 0.0, range: 0.0, cv_pct: 0.0 };

  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const valRange = Math.max(...values) - Math.min(...values);
  const cvPct = mean !== 0 ? (std / mean) * 100 : 0.0;

  return {
    mean: Math.round(mean * 1000) / 1000,
    std: Math.round(std * 1000) / 1000,
    range: Math.round(valRange * 1000) / 1000,
    cv_pct: Math.round(cvPct * 100) / 100,
  };
}

export interface ShaftData {
  arrow_number?: number;
  measured_weight_gr?: number | null;
  measured_spine_astm?: number | null;
  straightness?: number | null;
}

export interface GroupStats {
  weight: MetricStats | null;
  spine: MetricStats | null;
  straightness: MetricStats | null;
  shaft_count: number;
}

/**
 * Compute group-level statistics for a list of shaft data.
 */
export function computeGroupStats(shafts: ShaftData[]): GroupStats {
  const weights = shafts.filter((s) => s.measured_weight_gr != null).map((s) => s.measured_weight_gr!);
  const spines = shafts.filter((s) => s.measured_spine_astm != null).map((s) => s.measured_spine_astm!);
  const straights = shafts.filter((s) => s.straightness != null).map((s) => s.straightness!);

  return {
    weight: metricStats(weights),
    spine: metricStats(spines),
    straightness: metricStats(straights),
    shaft_count: shafts.length,
  };
}

// ---------------------------------------------------------------------------
// Outlier detection
// ---------------------------------------------------------------------------

export interface OutlierResult {
  arrow_number: number;
  feature: string;
  value: number;
  z_score: number;
  reason: string;
}

/**
 * Z-score outlier detection across weight, spine, and straightness.
 * Requires >= 3 shafts with data for a given feature.
 */
export function detectOutliers(shafts: ShaftData[], threshold = 2.0): OutlierResult[] {
  if (shafts.length < 3) return [];

  const results: OutlierResult[] = [];
  const features: Array<[string, keyof ShaftData, string]> = [
    ["weight", "measured_weight_gr", "gr"],
    ["spine", "measured_spine_astm", ""],
    ["straightness", "straightness", ""],
  ];

  for (const [featureName, key, unit] of features) {
    const values: Array<[ShaftData, number]> = [];
    for (const s of shafts) {
      const v = s[key];
      if (v != null && typeof v === "number") values.push([s, v]);
    }
    if (values.length < 3) continue;

    const vals = values.map(([, v]) => v);
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1));
    if (std === 0) continue;

    for (const [shaft, val] of values) {
      const z = Math.abs(val - mean) / std;
      if (z >= threshold) {
        const direction = val > mean ? "above" : "below";
        const suffix = unit ? ` ${unit}` : "";
        const reason = `${featureName.charAt(0).toUpperCase() + featureName.slice(1)} ${z.toFixed(1)}σ ${direction} mean (${val}${suffix} vs ${mean.toFixed(1)}${suffix} mean)`;
        results.push({
          arrow_number: shaft.arrow_number ?? 0,
          feature: featureName,
          value: val,
          z_score: Math.round(z * 100) / 100,
          reason,
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Set consistency scoring & best-set finder
// ---------------------------------------------------------------------------

const DEFAULT_WEIGHTS = { weight: 0.4, spine: 0.35, straightness: 0.25 };

/**
 * Score a set of shafts by consistency. Lower = more consistent.
 */
export function scoreSetConsistency(
  shafts: ShaftData[],
  weights?: Partial<typeof DEFAULT_WEIGHTS>,
): number {
  if (shafts.length < 2) return 0.0;

  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const features: Array<[string, keyof ShaftData]> = [
    ["weight", "measured_weight_gr"],
    ["spine", "measured_spine_astm"],
    ["straightness", "straightness"],
  ];

  let score = 0.0;
  for (const [featName, key] of features) {
    const vals = shafts.filter((s) => s[key] != null).map((s) => s[key] as number);
    if (vals.length < 2) continue;

    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / vals.length);
    const normStd = mean !== 0 ? std / Math.abs(mean) : std;
    score += (w[featName as keyof typeof w] ?? 0) * normStd;
  }

  return Math.round(score * 1000000) / 1000000;
}

function stdPop(vals: number[]): number {
  if (vals.length < 2) return 0.0;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(Math.sqrt(vals.reduce((acc, v) => acc + (v - m) ** 2, 0) / vals.length) * 10000) / 10000;
}

export interface BestSetResult {
  rank: number;
  arrow_numbers: number[];
  consistency_score: number;
  weight_std_gr: number;
  spine_std: number;
  straightness_std: number;
}

/**
 * Find the top N most consistent sets of set_size arrows.
 * Uses exhaustive search for small N; random sampling when combinations exceed maxCombinations.
 */
export function findBestSets(
  shafts: ShaftData[],
  setSize = 6,
  topN = 5,
  weights?: Partial<typeof DEFAULT_WEIGHTS>,
  maxCombinations = 200_000,
): BestSetResult[] {
  const n = shafts.length;
  if (n < setSize) return [];

  // Generate combinations
  const candidates: number[][] = [];

  function* combinations(arr: number[], r: number): Generator<number[]> {
    if (r === 0) { yield []; return; }
    for (let i = 0; i <= arr.length - r; i++) {
      for (const rest of combinations(arr.slice(i + 1), r - 1)) {
        yield [arr[i], ...rest];
      }
    }
  }

  // Estimate total combinations (n choose setSize)
  function comb(n: number, k: number): number {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 0; i < Math.min(k, n - k); i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return Math.round(result);
  }

  const totalCombos = comb(n, setSize);

  if (totalCombos <= maxCombinations) {
    const indices = Array.from({ length: n }, (_, i) => i);
    for (const combo of combinations(indices, setSize)) {
      candidates.push(combo);
    }
  } else {
    // Random sampling
    const seen = new Set<string>();
    const indices = Array.from({ length: n }, (_, i) => i);
    while (seen.size < maxCombinations) {
      const shuffled = [...indices].sort(() => Math.random() - 0.5);
      const combo = shuffled.slice(0, setSize).sort((a, b) => a - b);
      const key = combo.join(",");
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push(combo);
      }
    }
  }

  // Score all candidates
  const scored: Array<[number, number[]]> = candidates.map((combo) => {
    const subset = combo.map((i) => shafts[i]);
    return [scoreSetConsistency(subset, weights), combo];
  });

  scored.sort((a, b) => a[0] - b[0]);

  return scored.slice(0, topN).map(([consistency, combo], idx) => {
    const subset = combo.map((i) => shafts[i]);
    const arrowNumbers = subset.map((s) => s.arrow_number ?? 0).sort((a, b) => a - b);

    const weightVals = subset.filter((s) => s.measured_weight_gr != null).map((s) => s.measured_weight_gr!);
    const spineVals = subset.filter((s) => s.measured_spine_astm != null).map((s) => s.measured_spine_astm!);
    const straightVals = subset.filter((s) => s.straightness != null).map((s) => s.straightness!);

    return {
      rank: idx + 1,
      arrow_numbers: arrowNumbers,
      consistency_score: consistency,
      weight_std_gr: stdPop(weightVals),
      spine_std: stdPop(spineVals),
      straightness_std: stdPop(straightVals),
    };
  });
}

// ---------------------------------------------------------------------------
// Similar arrows finder
// ---------------------------------------------------------------------------

export interface SimilarArrowResult {
  arrow_number: number;
  similarity_score: number;
  weight_diff_gr: number;
  spine_diff: number;
  straightness_diff: number;
}

/**
 * Find arrows most similar to a reference set's centroid.
 */
export function findSimilarArrows(
  referenceArrows: ShaftData[],
  candidates: ShaftData[],
  topN = 5,
): SimilarArrowResult[] {
  if (referenceArrows.length === 0 || candidates.length === 0) return [];

  const features = ["measured_weight_gr", "measured_spine_astm", "straightness"] as const;

  // Compute centroid
  const centroid: Record<string, number> = {};
  for (const feat of features) {
    const vals = referenceArrows.filter((a) => a[feat] != null).map((a) => a[feat] as number);
    centroid[feat] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.0;
  }

  // Normalization ranges
  const allArrows = [...referenceArrows, ...candidates];
  const ranges: Record<string, [number, number]> = {};
  for (const feat of features) {
    const vals = allArrows.filter((a) => a[feat] != null).map((a) => a[feat] as number);
    if (vals.length > 0) {
      ranges[feat] = [Math.min(...vals), Math.max(...vals)];
    } else {
      ranges[feat] = [0.0, 1.0];
    }
  }

  function normalize(value: number, feat: string): number {
    const [lo, hi] = ranges[feat];
    return hi !== lo ? (value - lo) / (hi - lo) : 0.5;
  }

  const centroidNorm: Record<string, number> = {};
  for (const feat of features) {
    centroidNorm[feat] = normalize(centroid[feat], feat);
  }

  // Rank candidates
  const scored: Array<[number, SimilarArrowResult]> = [];
  for (const arrow of candidates) {
    let skip = false;
    const valsNorm: Record<string, number> = {};
    const rawVals: Record<string, number> = {};

    for (const feat of features) {
      const v = arrow[feat];
      if (v == null) { skip = true; break; }
      valsNorm[feat] = normalize(v as number, feat);
      rawVals[feat] = v as number;
    }
    if (skip) continue;

    const dist = Math.sqrt(features.reduce((acc, f) => acc + (valsNorm[f] - centroidNorm[f]) ** 2, 0));
    const maxDist = Math.sqrt(features.length);
    const similarity = Math.max(0.0, (1.0 - dist / maxDist) * 100.0);

    scored.push([similarity, {
      arrow_number: arrow.arrow_number ?? 0,
      similarity_score: Math.round(similarity * 10) / 10,
      weight_diff_gr: Math.round((rawVals.measured_weight_gr - centroid.measured_weight_gr) * 100) / 100,
      spine_diff: Math.round((rawVals.measured_spine_astm - centroid.measured_spine_astm) * 100) / 100,
      straightness_diff: Math.round((rawVals.straightness - centroid.straightness) * 10000) / 10000,
    }]);
  }

  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, topN).map(([, result]) => result);
}
