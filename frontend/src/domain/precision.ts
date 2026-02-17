/**
 * Advanced precision and statistical metrics for archery shot analysis.
 * Ported from src/precision.py.
 *
 * Replaces NumPy/SciPy with hand-rolled statistical functions:
 * - chi2 PPF via Wilson-Hilferty approximation
 * - 2×2 eigendecomposition (analytic)
 * - Welch's t-test
 * - Linear regression (least squares)
 * - Monte Carlo hit probability (JS random)
 */

// ---------------------------------------------------------------------------
// Statistical utilities (replacing scipy.stats / numpy.linalg)
// ---------------------------------------------------------------------------

/** Standard normal CDF (Abramowitz & Stegun approximation). */
export function normalCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

/** Inverse standard normal (Rational approximation by Beasley-Springer-Moro). */
function normalPpf(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00,
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/**
 * Chi-squared PPF (inverse CDF) via Wilson-Hilferty approximation.
 * chi2.ppf(p, df) ≈ df * (1 - 2/(9*df) + z_p * sqrt(2/(9*df)))^3
 */
function chi2Ppf(p: number, df: number): number {
  if (df <= 0) return 0;
  const z = normalPpf(p);
  const term = 2.0 / (9.0 * df);
  const cube = 1.0 - term + z * Math.sqrt(term);
  return df * Math.pow(Math.max(cube, 0), 3);
}

/**
 * Regularized lower incomplete gamma function P(a, x) using series expansion.
 * Used for chi2 CDF: P(df/2, x/2).
 */
function lowerGammaP(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;

  // Series expansion: P(a, x) = e^(-x) * x^a * sum(x^n / gamma(a+n+1))
  let sum = 1.0 / a;
  let term = 1.0 / a;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-12 * Math.abs(sum)) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

/** Log-gamma function (Lanczos approximation). */
function lnGamma(z: number): number {
  const g = 7;
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Chi-squared CDF. */
export function chi2Cdf(x: number, df: number): number {
  if (x <= 0) return 0;
  return lowerGammaP(df / 2, x / 2);
}

/** Student's t CDF (numerical integration via regularized incomplete beta). */
function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const ibeta = regularizedBetaI(df / 2, 0.5, x);
  if (t >= 0) {
    return 1 - 0.5 * ibeta;
  } else {
    return 0.5 * ibeta;
  }
}

/** Regularized incomplete beta function I_x(a, b) via continued fraction. */
function regularizedBetaI(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta);

  if (x < (a + 1) / (a + b + 2)) {
    return front * betaCf(a, b, x) / a;
  } else {
    return 1 - front * betaCf(b, a, 1 - x) / b;
  }
}

/** Continued fraction for incomplete beta. */
function betaCf(a: number, b: number, x: number): number {
  const maxIter = 200;
  const eps = 1e-12;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1.0;
  let d = 1.0 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1.0 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1.0 / d;
    h *= d * c;

    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1.0 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1.0 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1.0) < eps) break;
  }
  return h;
}

// ---------------------------------------------------------------------------
// Exported precision functions
// ---------------------------------------------------------------------------

/** Distance Root Mean Square — √(σ_x² + σ_y²). Contains ~63.2% of shots. */
export function computeDrms(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const varX = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0) / n;
  const varY = ys.reduce((acc, y) => acc + (y - meanY) ** 2, 0) / n;
  return Math.sqrt(varX + varY);
}

/** 95th percentile radial error. Empirical percentile of radial distances. */
export function computeR95(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
  const cx = xs.reduce((a, b) => a + b, 0) / n;
  const cy = ys.reduce((a, b) => a + b, 0) / n;
  const radii = xs.map((x, i) => Math.sqrt((x - cx) ** 2 + (ys[i] - cy) ** 2));
  radii.sort((a, b) => a - b);

  const idx = Math.ceil(0.95 * n) - 1;
  return radii[Math.min(idx, n - 1)];
}

/** Maximum pairwise distance between any two shots. */
export function computeExtremeSpread(xs: number[], ys: number[]): number {
  if (xs.length < 2) return 0.0;
  let maxDist = 0;
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) {
      const d = Math.sqrt((xs[i] - xs[j]) ** 2 + (ys[i] - ys[j]) ** 2);
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

/**
 * Rayleigh scale parameter σ_r with χ² confidence interval.
 */
export function computeRayleighSigmaWithCi(
  xs: number[],
  ys: number[],
  confidence = 0.95,
): { sigma: number; ci_lower: number; ci_upper: number; confidence: number } {
  const n = xs.length;
  const cx = xs.reduce((a, b) => a + b, 0) / n;
  const cy = ys.reduce((a, b) => a + b, 0) / n;
  const rSq = xs.reduce((acc, x, i) => acc + (x - cx) ** 2 + (ys[i] - cy) ** 2, 0);

  const sigmaSq = rSq / (2 * n);
  const sigma = Math.sqrt(sigmaSq);

  const alpha = 1 - confidence;
  const chi2Lower = chi2Ppf(alpha / 2, 2 * n);
  const chi2Upper = chi2Ppf(1 - alpha / 2, 2 * n);

  const ciLower = sigma * Math.sqrt((2 * n) / chi2Upper);
  const ciUpper = sigma * Math.sqrt((2 * n) / chi2Lower);

  return {
    sigma: Math.round(sigma * 1000) / 1000,
    ci_lower: Math.round(ciLower * 1000) / 1000,
    ci_upper: Math.round(ciUpper * 1000) / 1000,
    confidence,
  };
}

/**
 * ISO 5725 accuracy vs precision decomposition.
 */
export function computeAccuracyPrecisionRatio(
  xs: number[],
  ys: number[],
): {
  bias_sq: number;
  variance: number;
  total_mspe: number;
  accuracy_pct: number;
  precision_pct: number;
  interpretation: string;
} {
  const n = xs.length;
  const mpiX = xs.reduce((a, b) => a + b, 0) / n;
  const mpiY = ys.reduce((a, b) => a + b, 0) / n;
  const biasSq = mpiX ** 2 + mpiY ** 2;

  const varX = xs.reduce((acc, x) => acc + (x - mpiX) ** 2, 0) / n;
  const varY = ys.reduce((acc, y) => acc + (y - mpiY) ** 2, 0) / n;
  const variance = varX + varY;
  const totalMspe = biasSq + variance;

  if (totalMspe < 0.001) {
    return {
      bias_sq: 0.0, variance: 0.0, total_mspe: 0.0,
      accuracy_pct: 0.0, precision_pct: 0.0,
      interpretation: "Perfect — no error detected",
    };
  }

  const accuracyPct = (biasSq / totalMspe) * 100;
  const precisionPct = (variance / totalMspe) * 100;

  let interp: string;
  if (accuracyPct > 60) {
    interp = "Aim-dominant error — adjust crawl marks or sight picture";
  } else if (precisionPct > 60) {
    interp = "Consistency-dominant error — focus on shot execution";
  } else {
    interp = "Mixed error — both aim and consistency need attention";
  }

  return {
    bias_sq: Math.round(biasSq * 1000) / 1000,
    variance: Math.round(variance * 1000) / 1000,
    total_mspe: Math.round(totalMspe * 1000) / 1000,
    accuracy_pct: Math.round(accuracyPct * 10) / 10,
    precision_pct: Math.round(precisionPct * 10) / 10,
    interpretation: interp,
  };
}

/**
 * Coefficient of Variation (CV) of session scores.
 */
export function computePracticeConsistency(scores: number[]): {
  cv: number;
  mean: number;
  std: number;
  interpretation: string;
} {
  if (scores.length < 2) {
    return { cv: 0.0, mean: scores[0] ?? 0.0, std: 0.0, interpretation: "Need more sessions" };
  }

  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(scores.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1));

  if (mean < 0.001) return { cv: 0.0, mean: 0.0, std: 0.0, interpretation: "No data" };

  const cv = (std / mean) * 100;

  let interp: string;
  if (cv < 3) interp = "Excellent consistency — very reproducible";
  else if (cv < 6) interp = "Good consistency";
  else if (cv < 10) interp = "Moderate variability";
  else interp = "High variability — performance fluctuates significantly";

  return {
    cv: Math.round(cv * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    std: Math.round(std * 100) / 100,
    interpretation: interp,
  };
}

/**
 * Exponentially Weighted Moving Average with control limits.
 */
export function computeEwma(
  values: number[],
  lam = 0.2,
): { ewma: number[]; ucl: number[]; lcl: number[]; mean: number; sigma: number } {
  if (values.length < 2) {
    return { ewma: [...values], ucl: [...values], lcl: [...values], mean: values[0] ?? 0.0, sigma: 0.0 };
  }

  const n = values.length;
  const mu = values.reduce((a, b) => a + b, 0) / n;
  const sigma = Math.sqrt(values.reduce((acc, v) => acc + (v - mu) ** 2, 0) / (n - 1));
  const L = 2.7;

  const ewmaVals: number[] = [];
  const uclVals: number[] = [];
  const lclVals: number[] = [];

  let ewmaT = mu;
  for (let i = 0; i < n; i++) {
    ewmaT = lam * values[i] + (1 - lam) * ewmaT;
    const factor = sigma * Math.sqrt((lam / (2 - lam)) * (1 - Math.pow(1 - lam, 2 * (i + 1))));
    ewmaVals.push(Math.round(ewmaT * 10000) / 10000);
    uclVals.push(Math.round((mu + L * factor) * 10000) / 10000);
    lclVals.push(Math.round((mu - L * factor) * 10000) / 10000);
  }

  return {
    ewma: ewmaVals,
    ucl: uclVals,
    lcl: lclVals,
    mean: Math.round(mu * 10000) / 10000,
    sigma: Math.round(sigma * 10000) / 10000,
  };
}

/**
 * Score as function of shot position within an end.
 */
export function computeWithinEndTrend(
  shotsByPosition: Record<number, number[]>,
): {
  positions: Array<{ position: number; avg_score: number; count: number }>;
  best_position: number;
  worst_position: number;
  interpretation: string;
} {
  const keys = Object.keys(shotsByPosition).map(Number).sort((a, b) => a - b);

  if (keys.length === 0) {
    return { positions: [], best_position: 0, worst_position: 0, interpretation: "No data" };
  }

  const results = keys.map((pos) => {
    const scores = shotsByPosition[pos];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { position: pos + 1, avg_score: Math.round(avg * 1000) / 1000, count: scores.length };
  });

  if (results.length === 0) {
    return { positions: [], best_position: 0, worst_position: 0, interpretation: "No data" };
  }

  const best = results.reduce((a, b) => (a.avg_score > b.avg_score ? a : b));
  const worst = results.reduce((a, b) => (a.avg_score < b.avg_score ? a : b));

  const diff = best.avg_score - worst.avg_score;
  let interp: string;
  if (diff < 0.2) {
    interp = "Consistent across all shot positions";
  } else if (worst.position === 1) {
    interp = `First arrow is weakest (${worst.avg_score.toFixed(2)} avg). Consider a more deliberate pre-shot routine.`;
  } else if (worst.position === results[results.length - 1].position) {
    interp = `Last arrow is weakest (${worst.avg_score.toFixed(2)} avg). May indicate rushing or fatigue within the end.`;
  } else {
    interp = `Shot ${worst.position} is weakest (${worst.avg_score.toFixed(2)} avg), shot ${best.position} is best (${best.avg_score.toFixed(2)} avg).`;
  }

  return { positions: results, best_position: best.position, worst_position: worst.position, interpretation: interp };
}

/**
 * Confidence ellipse from 2x2 covariance matrix eigendecomposition.
 */
export function computeConfidenceEllipse(
  xs: number[],
  ys: number[],
  coverage = 0.9,
): {
  center_x: number;
  center_y: number;
  semi_major: number;
  semi_minor: number;
  angle_deg: number;
  coverage: number;
  correlation: number;
} {
  const n = xs.length;
  const cx = xs.reduce((a, b) => a + b, 0) / n;
  const cy = ys.reduce((a, b) => a + b, 0) / n;

  if (n < 3) {
    return { center_x: cx, center_y: cy, semi_major: 0, semi_minor: 0, angle_deg: 0, coverage, correlation: 0 };
  }

  // 2×2 covariance matrix (ddof=1 like np.cov default)
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - cx;
    const dy = ys[i] - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= (n - 1);
  syy /= (n - 1);
  sxy /= (n - 1);

  // Analytic eigenvalues of 2×2 symmetric matrix [[sxx, sxy], [sxy, syy]]
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(trace * trace / 4 - det, 0));
  const eig1 = trace / 2 + disc; // larger
  const eig2 = trace / 2 - disc; // smaller

  const chi2Val = chi2Ppf(coverage, 2);

  const semiMajor = Math.sqrt(eig1 * chi2Val);
  const semiMinor = Math.sqrt(Math.max(eig2, 0) * chi2Val);

  // Angle of major axis eigenvector
  let angleDeg: number;
  if (Math.abs(sxy) < 1e-12) {
    angleDeg = sxx >= syy ? 0 : 90;
  } else {
    angleDeg = (Math.atan2(eig1 - sxx, sxy) * 180) / Math.PI;
  }

  // Correlation
  const stdX = Math.sqrt(sxx);
  const stdY = Math.sqrt(syy);
  const corr = stdX > 0 && stdY > 0 ? sxy / (stdX * stdY) : 0;

  return {
    center_x: Math.round(cx * 1000) / 1000,
    center_y: Math.round(cy * 1000) / 1000,
    semi_major: Math.round(semiMajor * 1000) / 1000,
    semi_minor: Math.round(semiMinor * 1000) / 1000,
    angle_deg: Math.round(angleDeg * 100) / 100,
    coverage,
    correlation: Math.round(corr * 10000) / 10000,
  };
}

/**
 * Statistical outlier detection using Mahalanobis distance.
 * Falls back to standard covariance (no MinCovDet in browser).
 */
export function detectFliers(
  xs: number[],
  ys: number[],
  _thresholdSigma = 2.5,
): {
  flier_indices: number[];
  flier_count: number;
  flier_pct: number;
  clean_sigma: number;
  full_sigma: number;
  interpretation: string;
} {
  const n = xs.length;
  const fullDrms = computeDrms(xs, ys);

  if (n < 5) {
    return {
      flier_indices: [], flier_count: 0, flier_pct: 0.0,
      clean_sigma: Math.round(fullDrms * 1000) / 1000,
      full_sigma: Math.round(fullDrms * 1000) / 1000,
      interpretation: "Too few shots for flier detection",
    };
  }

  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;

  // Covariance matrix
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= n; syy /= n; sxy /= n;

  // Inverse of 2×2 matrix
  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-12) {
    return {
      flier_indices: [], flier_count: 0, flier_pct: 0.0,
      clean_sigma: Math.round(fullDrms * 1000) / 1000,
      full_sigma: Math.round(fullDrms * 1000) / 1000,
      interpretation: "Cannot compute — singular covariance",
    };
  }

  const invXX = syy / det, invYY = sxx / det, invXY = -sxy / det;

  // Mahalanobis distances
  const mahalDist = xs.map((x, i) => {
    const dx = x - mx;
    const dy = ys[i] - my;
    return dx * dx * invXX + 2 * dx * dy * invXY + dy * dy * invYY;
  });

  const chi2Threshold = chi2Ppf(0.975, 2);
  const flierIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (mahalDist[i] > chi2Threshold) flierIndices.push(i);
  }

  let cleanSigma = fullDrms;
  if (flierIndices.length > 0 && flierIndices.length < n - 2) {
    const flierSet = new Set(flierIndices);
    const cleanXs = xs.filter((_, i) => !flierSet.has(i));
    const cleanYs = ys.filter((_, i) => !flierSet.has(i));
    cleanSigma = computeDrms(cleanXs, cleanYs);
  }

  const flierPct = (flierIndices.length / n) * 100;
  let interp: string;
  if (flierPct === 0) {
    interp = "No statistical outliers detected";
  } else if (flierPct < 5) {
    interp = `${flierIndices.length} flier(s) detected — isolated execution errors`;
  } else if (flierPct < 15) {
    interp = `${flierIndices.length} fliers (${flierPct.toFixed(0)}%) — consider form consistency drills`;
  } else {
    interp = `High flier rate (${flierPct.toFixed(0)}%) — uniformly large group, not isolated errors`;
  }

  return {
    flier_indices: flierIndices,
    flier_count: flierIndices.length,
    flier_pct: Math.round(flierPct * 10) / 10,
    clean_sigma: Math.round(cleanSigma * 1000) / 1000,
    full_sigma: Math.round(fullDrms * 1000) / 1000,
    interpretation: interp,
  };
}

/**
 * Monte Carlo hit probability estimation for each scoring ring.
 */
export function computeHitProbability(
  sigmaX: number,
  sigmaY: number,
  mpiX: number,
  mpiY: number,
  faceSizeCm: number,
): { ring_probs: Array<{ ring: number; probability: number }>; expected_score: number } {
  const ringWidth = faceSizeCm / 20.0;
  if (sigmaX < 0.01) sigmaX = 0.01;
  if (sigmaY < 0.01) sigmaY = 0.01;

  const nSamples = 50000;
  // Deterministic seeded PRNG using simple mulberry32
  const seed = 42;
  let state = seed;
  function rand(): number {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Box-Muller transform
  function normalRand(mean: number, std: number): number {
    const u1 = rand();
    const u2 = rand();
    return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Generate samples and bin by ring
  const ringCounts = new Array(11).fill(0); // indices 0-10

  for (let i = 0; i < nSamples; i++) {
    const sx = normalRand(mpiX, sigmaX);
    const sy = normalRand(mpiY, sigmaY);
    const r = Math.sqrt(sx * sx + sy * sy);

    const ringIdx = Math.ceil(r / ringWidth);
    if (ringIdx <= 0) {
      ringCounts[10]++;
    } else if (ringIdx <= 10) {
      ringCounts[11 - ringIdx]++;
    } else {
      ringCounts[0]++; // miss
    }
  }

  const ringProbs: Array<{ ring: number; probability: number }> = [];
  for (let ring = 10; ring >= 1; ring--) {
    ringProbs.push({
      ring,
      probability: Math.round((ringCounts[ring] / nSamples) * 10000) / 100,
    });
  }
  ringProbs.push({
    ring: 0,
    probability: Math.round((ringCounts[0] / nSamples) * 10000) / 100,
  });

  const expected = ringProbs.reduce((acc, rp) => acc + rp.ring * (rp.probability / 100), 0);

  return {
    ring_probs: ringProbs,
    expected_score: Math.round(expected * 1000) / 1000,
  };
}

/**
 * Angular deviation (σ_theta) across multiple distances with distance-effect detection.
 */
export function computeMultiDistanceProfile(
  distanceData: Array<{ distance_m: number; sigma_cm: number; session_count: number; round_type: string }>,
): {
  distances: Array<{ distance_m: number; sigma_cm: number; session_count: number; round_type: string; sigma_theta_mrad: number }>;
  mean_sigma_theta_mrad: number;
  distance_effect: boolean;
  interpretation: string;
} {
  if (distanceData.length < 2) {
    return {
      distances: distanceData.map((d) => ({ ...d, sigma_theta_mrad: 0 })),
      mean_sigma_theta_mrad: 0.0,
      distance_effect: false,
      interpretation: "Need data at ≥2 distances",
    };
  }

  const sorted = [...distanceData].sort((a, b) => a.distance_m - b.distance_m);
  const results = sorted.map((d) => {
    const distCm = d.distance_m * 100;
    const thetaMrad = distCm > 0 ? (d.sigma_cm / distCm) * 1000 : 0;
    return { ...d, sigma_theta_mrad: Math.round(thetaMrad * 1000) / 1000 };
  });

  const thetas = results.map((r) => r.sigma_theta_mrad);
  const weights = results.map((r) => r.session_count);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const meanTheta = thetas.reduce((acc, t, i) => acc + t * weights[i], 0) / totalWeight;

  let distanceEffect = false;
  let interp: string;

  if (thetas.length >= 3) {
    // Linear regression: theta vs distance
    const distances = results.map((r) => r.distance_m);
    const n = distances.length;
    const xMean = distances.reduce((a, b) => a + b, 0) / n;
    const yMean = thetas.reduce((a, b) => a + b, 0) / n;

    let ssxy = 0, ssxx = 0, ssyy = 0;
    for (let i = 0; i < n; i++) {
      const dx = distances[i] - xMean;
      const dy = thetas[i] - yMean;
      ssxy += dx * dy;
      ssxx += dx * dx;
      ssyy += dy * dy;
    }

    const slope = ssxx > 0 ? ssxy / ssxx : 0;
    // rValue not used currently but computed for potential future use
    ssxx > 0 && ssyy > 0 ? ssxy / Math.sqrt(ssxx * ssyy) : 0;

    // P-value from t-test on slope
    const sResid = Math.sqrt(Math.max(0, (ssyy - slope * ssxy)) / (n - 2));
    const sSlope = ssxx > 0 ? sResid / Math.sqrt(ssxx) : 0;
    const tStat = sSlope > 0 ? slope / sSlope : 0;
    const pValue = n > 2 ? 2 * (1 - tCdf(Math.abs(tStat), n - 2)) : 1;

    distanceEffect = pValue < 0.1 && slope > 0;
    if (distanceEffect) {
      interp = `Distance-dependent degradation detected (slope=${slope.toFixed(4)} mrad/m, p=${pValue.toFixed(3)}). Equipment drag or tuning may limit long-distance performance.`;
    } else {
      interp = `Consistent angular precision across distances (mean σ_θ = ${meanTheta.toFixed(2)} mrad).`;
    }
  } else {
    if (thetas[1] > thetas[0] * 1.2) {
      distanceEffect = true;
      interp = `Angular deviation increases at longer distance (${thetas[0].toFixed(2)} → ${thetas[1].toFixed(2)} mrad). Possible equipment drag or tuning issue.`;
    } else {
      interp = `Similar angular precision across distances (mean σ_θ = ${meanTheta.toFixed(2)} mrad).`;
    }
  }

  return {
    distances: results,
    mean_sigma_theta_mrad: Math.round(meanTheta * 1000) / 1000,
    distance_effect: distanceEffect,
    interpretation: interp,
  };
}

/**
 * Statistical comparison of two equipment setups using Welch's t-test.
 */
export function computeEquipmentComparison(
  setupAScores: number[],
  setupASigmas: number[],
  setupAName: string,
  setupBScores: number[],
  setupBSigmas: number[],
  setupBName: string,
): {
  setup_a: string;
  setup_b: string;
  score_diff: number;
  score_p_value: number;
  score_cohens_d: number;
  sigma_diff: number;
  sigma_p_value: number;
  score_significant: boolean;
  sigma_significant: boolean;
  interpretation: string;
} {
  if (setupAScores.length < 2 || setupBScores.length < 2) {
    return {
      setup_a: setupAName, setup_b: setupBName,
      score_diff: 0, score_p_value: 1, score_cohens_d: 0,
      sigma_diff: 0, sigma_p_value: 1,
      score_significant: false, sigma_significant: false,
      interpretation: "Need ≥2 sessions with each setup for comparison",
    };
  }

  function welchTTest(a: number[], b: number[]): [number, number] {
    const nA = a.length, nB = b.length;
    const mA = a.reduce((s, v) => s + v, 0) / nA;
    const mB = b.reduce((s, v) => s + v, 0) / nB;
    const vA = a.reduce((s, v) => s + (v - mA) ** 2, 0) / (nA - 1);
    const vB = b.reduce((s, v) => s + (v - mB) ** 2, 0) / (nB - 1);

    const se = Math.sqrt(vA / nA + vB / nB);
    if (se < 1e-12) return [0, 1];

    const t = (mA - mB) / se;

    // Welch-Satterthwaite degrees of freedom
    const num = (vA / nA + vB / nB) ** 2;
    const den = (vA / nA) ** 2 / (nA - 1) + (vB / nB) ** 2 / (nB - 1);
    const df = den > 0 ? num / den : 1;

    const p = 2 * (1 - tCdf(Math.abs(t), df));
    return [t, p];
  }

  const meanA = setupAScores.reduce((s, v) => s + v, 0) / setupAScores.length;
  const meanB = setupBScores.reduce((s, v) => s + v, 0) / setupBScores.length;
  const scoreDiff = meanA - meanB;

  const [, pScore] = welchTTest(setupAScores, setupBScores);

  // Cohen's d
  const varA = setupAScores.reduce((s, v) => s + (v - meanA) ** 2, 0) / (setupAScores.length - 1);
  const varB = setupBScores.reduce((s, v) => s + (v - meanB) ** 2, 0) / (setupBScores.length - 1);
  const pooledStd = Math.sqrt((varA + varB) / 2);
  const cohensD = pooledStd > 0.001 ? scoreDiff / pooledStd : 0;

  // Sigma comparison
  const meanSigA = setupASigmas.reduce((s, v) => s + v, 0) / setupASigmas.length;
  const meanSigB = setupBSigmas.reduce((s, v) => s + v, 0) / setupBSigmas.length;
  const sigmaDiff = meanSigA - meanSigB;

  let pSigma = 1.0;
  if (setupASigmas.length >= 2 && setupBSigmas.length >= 2) {
    [, pSigma] = welchTTest(setupASigmas, setupBSigmas);
  }

  const scoreSig = pScore < 0.05;
  const sigmaSig = pSigma < 0.05;

  let interp: string;
  if (scoreSig && scoreDiff > 0) {
    interp = `${setupAName} scores significantly higher than ${setupBName} (p=${pScore.toFixed(3)}, d=${cohensD.toFixed(2)})`;
  } else if (scoreSig && scoreDiff < 0) {
    interp = `${setupBName} scores significantly higher than ${setupAName} (p=${pScore.toFixed(3)}, d=${Math.abs(cohensD).toFixed(2)})`;
  } else {
    interp = `No significant scoring difference between ${setupAName} and ${setupBName} (p=${pScore.toFixed(3)})`;
  }

  if (sigmaSig) {
    const better = sigmaDiff < 0 ? setupAName : setupBName;
    interp += `. ${better} produces tighter groups (p=${pSigma.toFixed(3)}).`;
  }

  return {
    setup_a: setupAName,
    setup_b: setupBName,
    score_diff: Math.round(scoreDiff * 1000) / 1000,
    score_p_value: Math.round(pScore * 10000) / 10000,
    score_cohens_d: Math.round(cohensD * 1000) / 1000,
    sigma_diff: Math.round(sigmaDiff * 1000) / 1000,
    sigma_p_value: Math.round(pSigma * 10000) / 10000,
    score_significant: scoreSig,
    sigma_significant: sigmaSig,
    interpretation: interp,
  };
}
