/**
 * Scoring service — mirrors api/routers/scoring.py.
 * Pure computation, no database access.
 */

import { getRingScore, getFlintScore } from "../domain/scoring";

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
    xIs11 = true
  ): ScoreResult {
    const radius = Math.sqrt(x * x + y * y);

    if (faceType === "Flint") {
      const score = getFlintScore(radius, faceCm);
      return { score, is_x: false };
    }

    const score = getRingScore(radius, faceCm);
    const is_x = score === 10 && xIs11 && radius <= faceCm / 40;
    return { score, is_x };
  },
};
