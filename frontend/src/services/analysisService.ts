/**
 * Analysis service — mirrors api/routers/analysis.py.
 * Virtual coach, score prediction, setup efficiency, safety check.
 */

import type { BowSetup, ArrowSetup } from "../types/models";
import { bowRepo, arrowRepo } from "../db";
import { VirtualCoach, type CoachAnalysis } from "../domain/analysis";
import { predictScoreAtDistance } from "../domain/parkModel";
import { scoreSetupEfficiency, analyzeSetupSafety } from "../domain/physics";

export interface VirtualCoachRequest {
  bow_id: string;
  arrow_id: string;
  short_score: number;
  short_distance_m: number;
  short_face_cm: number;
  long_score: number;
  long_distance_m: number;
  long_face_cm: number;
}

export interface PredictScoreRequest {
  known_score: number;
  known_distance_m: number;
  known_face_cm: number;
  target_distance_m: number;
  target_face_cm: number;
}

export interface SetupEfficiencyRequest {
  bow_id: string;
  arrow_id: string;
  discipline: "indoor" | "outdoor";
}

export interface SafetyCheckRequest {
  bow_id: string;
  arrow_id: string;
}

function requireBow(id: string): BowSetup {
  const bow = bowRepo.getById(id);
  if (!bow) throw new Error("Bow setup not found");
  return bow;
}

function requireArrow(id: string): ArrowSetup {
  const arrow = arrowRepo.getById(id);
  if (!arrow) throw new Error("Arrow setup not found");
  return arrow;
}

export const analysisService = {
  virtualCoach(request: VirtualCoachRequest): CoachAnalysis {
    const bow = requireBow(request.bow_id);
    const arrow = requireArrow(request.arrow_id);
    const coach = new VirtualCoach(bow, arrow);
    return coach.analyzeSessionPerformance(
      request.short_score,
      request.short_distance_m,
      request.short_face_cm,
      request.long_score,
      request.long_distance_m,
      request.long_face_cm
    );
  },

  predictScore(request: PredictScoreRequest): { predicted_score: number; predicted_sigma: number } {
    const [predictedScore, predictedSigma] = predictScoreAtDistance(
      request.known_score,
      request.known_distance_m,
      request.known_face_cm,
      request.target_distance_m,
      request.target_face_cm
    );
    return {
      predicted_score: predictedScore,
      predicted_sigma: predictedSigma,
    };
  },

  setupEfficiency(request: SetupEfficiencyRequest) {
    const bow = requireBow(request.bow_id);
    const arrow = requireArrow(request.arrow_id);
    return scoreSetupEfficiency(bow, arrow, request.discipline);
  },

  safetyCheck(request: SafetyCheckRequest): { warnings: string[] } {
    const bow = requireBow(request.bow_id);
    const arrow = requireArrow(request.arrow_id);
    return { warnings: analyzeSetupSafety(bow, arrow) };
  },
};
