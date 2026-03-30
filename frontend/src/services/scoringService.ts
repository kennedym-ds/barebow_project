/**
 * Scoring service — mirrors api/routers/scoring.py.
 * Pure computation, no database access.
 */

import { getRingScore, getFlintScore, isXRing } from "../utils/scoring";

export interface ScoreResult {
  score: number;
  is_x: boolean;
}

export const scoringService = {
  /**
   * Calculate the ring score for a shot at coordinates (x, y) on a target
   * face of the given size. Mirrors GET /api/scoring/ring.
   */
  calculateScore(
    x: number,
    y: number,
    faceCm: number,
    faceType: "WA" | "Flint" = "WA",
    xIs11 = true,
    arrowDiameterMm = 0,
  ): ScoreResult {
    const radius = Math.sqrt(x * x + y * y);

    if (faceType === "Flint") {
      const score = getFlintScore(radius, faceCm, arrowDiameterMm);
      const is_x = isXRing(radius, faceCm, "Flint", arrowDiameterMm);
      return { score, is_x };
    }

    const score = getRingScore(radius, faceCm, xIs11, arrowDiameterMm);
    const is_x = xIs11 ? isXRing(radius, faceCm, "WA", arrowDiameterMm) : false;
    return { score, is_x };
  },
};
