/**
 * Scoring utilities ported from Python src/scoring.py
 * Pure client-side scoring functions for WA and IFAA Flint targets
 */

/**
 * WA target scoring: Ring width = face_size / 20.
 * ring_index = ceil(radius / ring_width)
 * Score = 11 - ring_index (clamped 0-10, with optional X=11)
 */
export function getRingScore(radiusCm: number, faceSizeCm: number, xIs11 = false): number {
  const ringWidth = faceSizeCm / 20;
  if (radiusCm < 0) return 0;
  
  const ringIndex = Math.ceil(radiusCm / ringWidth);
  
  if (ringIndex <= 1) {
    // Check for X-ring (half of 10-ring radius)
    if (xIs11 && radiusCm <= ringWidth / 2) return 11;
    return 10;
  }
  
  if (ringIndex <= 10) return 11 - ringIndex;
  return 0;
}

/**
 * IFAA Flint scoring: 5 (inner), 4, 3, 0 (miss).
 * r5 = face * 0.2 / 2, r4 = face * 0.4 / 2, r3 = face * 0.6 / 2
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

/**
 * Determine if a shot is in the X-ring
 */
export function isXRing(radiusCm: number, faceSizeCm: number, faceType: 'WA' | 'Flint'): boolean {
  if (faceType === 'Flint') {
    const r5 = (faceSizeCm * 0.2) / 2;
    const rx = r5 * 0.5;
    return radiusCm <= rx;
  } else {
    const ringWidth = faceSizeCm / 20;
    return radiusCm <= ringWidth / 2;
  }
}
