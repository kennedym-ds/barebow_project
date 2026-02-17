/**
 * James Park Model — separates archer skill (sigma/angular deviation) from equipment drag loss.
 * Ported from src/park_model.py — pure math, no external dependencies.
 */

/**
 * Returns outer radius of each scoring ring (10 down to 1) in cm.
 */
export function getRingRadii(faceDiameterCm: number): number[] {
  const ringWidth = faceDiameterCm / 20.0;
  const radii: number[] = [];
  for (let i = 1; i <= 10; i++) {
    radii.push(i * ringWidth);
  }
  return radii;
}

/**
 * Calculate expected average arrow score for a given radial standard deviation (sigma_r).
 * Formula: Average Score = 10 - Sum(exp(-R_i^2 / (2*sigma^2)))
 */
export function calculateExpectedScore(sigmaR: number, faceDiameterCm: number): number {
  if (sigmaR <= 0) return 10.0;

  const radii = getRingRadii(faceDiameterCm);
  let scoreLoss = 0.0;
  for (const r of radii) {
    scoreLoss += Math.exp(-(r * r) / (2 * sigmaR * sigmaR));
  }
  return 10.0 - scoreLoss;
}

/**
 * Reverse-solve expected score formula to find sigma_r that produces the given average arrow score.
 * Uses binary search.
 */
export function calculateSigmaFromScore(score: number, faceDiameterCm: number, tolerance = 0.001): number {
  if (score >= 10) return 0.0;
  if (score <= 0) return 1000.0;

  let low = 0.0;
  let high = 200.0;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const predicted = calculateExpectedScore(mid, faceDiameterCm);

    if (Math.abs(predicted - score) < tolerance) return mid;

    if (predicted > score) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

/**
 * Predict score at a new distance based on skill demonstrated at a known distance.
 * Returns [predictedScore, predictedSigmaR].
 */
export function predictScoreAtDistance(
  knownScore: number,
  knownDistanceM: number,
  knownFaceCm: number,
  targetDistanceM: number,
  targetFaceCm: number,
): [number, number] {
  const sigmaKnown = calculateSigmaFromScore(knownScore, knownFaceCm);

  if (knownDistanceM <= 0) return [0.0, 0.0];

  const sigmaTheta = sigmaKnown / (knownDistanceM * 100.0);
  const sigmaNew = sigmaTheta * (targetDistanceM * 100.0);
  const predictedScore = calculateExpectedScore(sigmaNew, targetFaceCm);

  return [predictedScore, sigmaNew];
}

/**
 * Quantify points lost due to non-linear factors (drag, drift, tuning)
 * by comparing actual long distance score to predicted score from short distance skill.
 */
export function calculateDragLoss(
  shortScore: number,
  shortDistM: number,
  shortFaceCm: number,
  longScore: number,
  longDistM: number,
  longFaceCm: number,
): { predicted_score: number; actual_score: number; points_lost: number; percent_loss: number } {
  const [predictedLong] = predictScoreAtDistance(shortScore, shortDistM, shortFaceCm, longDistM, longFaceCm);

  const loss = predictedLong - longScore;

  return {
    predicted_score: Math.round(predictedLong * 100) / 100,
    actual_score: Math.round(longScore * 100) / 100,
    points_lost: Math.round(loss * 100) / 100,
    percent_loss: predictedLong > 0 ? Math.round((loss / predictedLong) * 1000) / 10 : 0,
  };
}
