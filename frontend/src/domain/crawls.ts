/**
 * Crawl mark prediction for string-walking.
 * Ported from src/crawls.py — replaces NumPy polyfit/poly1d/roots with hand-rolled math.
 *
 * A "polynomial model" here is just an array of coefficients [a, b, c] for ax²+bx+c.
 */

/** Polynomial coefficients in descending order: [a, b, c] for degree 2, [a, b] for degree 1 */
export type CrawlModel = number[];

/**
 * Evaluate a polynomial at x. Coefficients in descending power order.
 */
function polyEval(coeffs: number[], x: number): number {
  let result = 0;
  for (let i = 0; i < coeffs.length; i++) {
    result = result * x + coeffs[i];
  }
  return result;
}

/**
 * Fit a polynomial of given degree using least-squares regression.
 * Hand-rolled normal equations solver (Vandermonde matrix approach).
 *
 * For degree 0: returns [mean]
 * For degree 1: returns [slope, intercept]
 * For degree 2: returns [a, b, c] for ax²+bx+c
 */
function polyfit(x: number[], y: number[], degree: number): number[] {
  const n = x.length;
  const cols = degree + 1;

  // Build Vandermonde matrix V where V[i][j] = x[i]^(degree-j)
  // Normal equations: (V^T V) a = V^T y

  // Build V^T V (cols x cols)
  const vtv: number[][] = Array.from({ length: cols }, () => Array(cols).fill(0));
  const vty: number[] = Array(cols).fill(0);

  for (let i = 0; i < n; i++) {
    // Powers of x[i]: x^degree, x^(degree-1), ..., x^0
    const powers: number[] = [];
    for (let j = 0; j < cols; j++) {
      powers.push(Math.pow(x[i], degree - j));
    }

    for (let r = 0; r < cols; r++) {
      for (let c = 0; c < cols; c++) {
        vtv[r][c] += powers[r] * powers[c];
      }
      vty[r] += powers[r] * y[i];
    }
  }

  // Solve via Gaussian elimination with partial pivoting
  const aug: number[][] = vtv.map((row, i) => [...row, vty[i]]);

  for (let col = 0; col < cols; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < cols; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let j = col; j <= cols; j++) {
      aug[col][j] /= pivot;
    }

    for (let row = 0; row < cols; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= cols; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row[cols]);
}

/**
 * Calculate a polynomial regression model (degree 2) for crawl prediction.
 * Returns polynomial coefficients in descending power order.
 *
 * Requires at least 2 data points. Uses degree 2 for 3+ points, degree 1 for 2 points.
 */
export function calculateCrawlRegression(knownDistances: number[], knownCrawls: number[]): CrawlModel {
  let degree: number;
  if (knownDistances.length < 3) {
    degree = knownDistances.length > 1 ? 1 : 0;
  } else {
    degree = 2;
  }

  return polyfit(knownDistances, knownCrawls, degree);
}

/**
 * Predict crawl for a specific distance using the regression model.
 */
export function predictCrawl(model: CrawlModel, distance: number): number {
  return polyEval(model, distance);
}

/**
 * Generate a lookup table of predicted crawls at regular distance intervals.
 */
export function generateCrawlChart(
  model: CrawlModel,
  minDist = 5,
  maxDist = 60,
  step = 5,
): Array<[number, number]> {
  const chart: Array<[number, number]> = [];
  for (let d = minDist; d <= maxDist; d += step) {
    const crawl = predictCrawl(model, d);
    chart.push([d, Math.round(crawl * 10) / 10]);
  }
  return chart;
}

/**
 * Find the Point-On distance — where crawl equals zero.
 * Solves polynomial roots and returns the smallest positive real root in range [5, 100].
 */
export function findPointOnDistance(model: CrawlModel): number | null {
  const coeffs = model;

  let roots: number[];

  if (coeffs.length === 3) {
    // Quadratic: ax² + bx + c = 0
    const [a, b, c] = coeffs;
    if (Math.abs(a) < 1e-12) {
      // Degenerate to linear
      if (Math.abs(b) < 1e-12) return null;
      roots = [-c / b];
    } else {
      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) return null;
      const sqrtD = Math.sqrt(discriminant);
      roots = [(-b + sqrtD) / (2 * a), (-b - sqrtD) / (2 * a)];
    }
  } else if (coeffs.length === 2) {
    // Linear: ax + b = 0
    const [a, b] = coeffs;
    if (Math.abs(a) < 1e-12) return null;
    roots = [-b / a];
  } else {
    return null;
  }

  // Filter to valid roots in reasonable range
  const validRoots = roots.filter((r) => r >= 5.0 && r <= 100.0);
  if (validRoots.length === 0) return null;

  return Math.round(Math.min(...validRoots) * 10) / 10;
}
