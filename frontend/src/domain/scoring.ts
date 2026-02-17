/**
 * Scoring functions for WA and IFAA Flint target faces.
 * Ported from src/scoring.py — ring-score calculation only.
 * create_target_face() is NOT ported (Plotly rendering stays in the frontend components).
 */

/**
 * Calculate score based on distance from center for WA target faces (1-10 rings).
 * Ring width = face diameter / 20.
 */
export function getRingScore(radiusCm: number, faceSizeCm: number, xIs11 = false): number {
  const ringWidth = faceSizeCm / 20.0;

  if (ringWidth <= 0) return 0;
  if (radiusCm < 0) return 0;

  const ringIndex = Math.ceil(radiusCm / ringWidth);

  if (ringIndex <= 1) {
    if (xIs11 && radiusCm <= ringWidth / 2) return 11;
    return 10;
  } else if (ringIndex <= 10) {
    return 11 - ringIndex;
  }
  return 0; // Miss
}

/**
 * Calculate score for IFAA Flint/Field rounds (5, 4, 3).
 * 5-ring diameter = face_size * 0.2
 * 4-ring diameter = face_size * 0.4
 * 3-ring diameter = face_size * 0.6
 */
export function getFlintScore(radiusCm: number, faceSizeCm: number): number {
  const r5 = (faceSizeCm * 0.2) / 2;
  const r4 = (faceSizeCm * 0.4) / 2;
  const r3 = (faceSizeCm * 0.6) / 2;

  if (radiusCm <= r5) return 5;
  if (radiusCm <= r4) return 4;
  if (radiusCm <= r3) return 3;
  return 0;
}
