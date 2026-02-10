/**
 * Scoring utilities ported from Python src/scoring.py
 * Pure client-side scoring functions for WA and IFAA Flint targets
 *
 * WA rule: If any part of the arrow shaft touches ("breaks") a higher-scoring
 * ring line, the arrow scores the higher value. We account for this by
 * subtracting the arrow's radius from the centre-of-impact distance before
 * evaluating the ring boundary, i.e. effective_radius = radius - arrowRadiusCm.
 */

/** Convert an arrow shaft diameter in mm to a radius in cm. */
function arrowRadiusCm(shaftDiameterMm: number): number {
  return (shaftDiameterMm / 10) / 2; // mm → cm, then halve for radius
}

/**
 * WA target scoring: Ring width = face_size / 20.
 * ring_index = ceil(effectiveRadius / ring_width)
 * Score = 11 - ring_index (clamped 0-10, with optional X=11)
 *
 * @param arrowDiameterMm  Shaft outer diameter in mm (default 0 = centre scoring)
 */
export function getRingScore(
  radiusCm: number,
  faceSizeCm: number,
  xIs11 = false,
  arrowDiameterMm = 0,
): number {
  const ringWidth = faceSizeCm / 20;
  if (radiusCm < 0) return 0;

  // Effective radius: closest edge of the shaft to the centre
  const effective = Math.max(0, radiusCm - arrowRadiusCm(arrowDiameterMm));
  const ringIndex = Math.ceil(effective / ringWidth);

  if (ringIndex <= 1) {
    if (xIs11 && effective <= ringWidth / 2) return 11;
    return 10;
  }

  if (ringIndex <= 10) return 11 - ringIndex;
  return 0;
}

/**
 * IFAA Flint scoring: 5 (inner), 4, 3, 0 (miss).
 * r5 = face * 0.2 / 2, r4 = face * 0.4 / 2, r3 = face * 0.6 / 2
 *
 * @param arrowDiameterMm  Shaft outer diameter in mm (default 0)
 */
export function getFlintScore(
  radiusCm: number,
  faceSizeCm: number,
  arrowDiameterMm = 0,
): number {
  const r5 = (faceSizeCm * 0.2) / 2;
  const r4 = (faceSizeCm * 0.4) / 2;
  const r3 = (faceSizeCm * 0.6) / 2;
  const effective = Math.max(0, radiusCm - arrowRadiusCm(arrowDiameterMm));

  if (effective <= r5) return 5;
  if (effective <= r4) return 4;
  if (effective <= r3) return 3;
  return 0;
}

/**
 * Determine if a shot is in the X-ring
 *
 * @param arrowDiameterMm  Shaft outer diameter in mm (default 0)
 */
export function isXRing(
  radiusCm: number,
  faceSizeCm: number,
  faceType: 'WA' | 'Flint',
  arrowDiameterMm = 0,
): boolean {
  const effective = Math.max(0, radiusCm - arrowRadiusCm(arrowDiameterMm));
  if (faceType === 'Flint') {
    const r5 = (faceSizeCm * 0.2) / 2;
    const rx = r5 * 0.5;
    return effective <= rx;
  } else {
    const ringWidth = faceSizeCm / 20;
    return effective <= ringWidth / 2;
  }
}
