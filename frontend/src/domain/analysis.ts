/**
 * VirtualCoach — orchestrates physics + Park model for session analysis.
 * Ported from src/analysis.py.
 */

import type { BowSetup, ArrowSetup } from "../types/models";
import { analyzeSetupSafety, scoreSetupEfficiency } from "./physics";
import { calculateDragLoss } from "./parkModel";

export interface CoachAnalysis {
  safety: string[];
  setup_score: { score: number; gpp: number; feedback: string[] };
  performance_metrics: {
    predicted_score: number;
    actual_score: number;
    points_lost: number;
    percent_loss: number;
  };
  coach_recommendations: string[];
}

export class VirtualCoach {
  constructor(
    private bow: BowSetup,
    private arrow: ArrowSetup,
  ) {}

  /**
   * Full analysis pipeline:
   * 1. Equipment safety check
   * 2. Setup efficiency scoring
   * 3. Drag/skill loss calculation
   * 4. Synthesis & recommendations
   */
  analyzeSessionPerformance(
    shortScore: number,
    shortDist: number,
    shortFace: number,
    longScore: number,
    longDist: number,
    longFace: number,
  ): CoachAnalysis {
    const safetyWarnings = analyzeSetupSafety(this.bow, this.arrow);

    const discipline = longDist > 30 ? "outdoor" : "indoor";
    const setupAnalysis = scoreSetupEfficiency(this.bow, this.arrow, discipline as "indoor" | "outdoor");

    const dragAnalysis = calculateDragLoss(shortScore, shortDist, shortFace, longScore, longDist, longFace);

    const recommendations: string[] = [];
    if (dragAnalysis.percent_loss > 10.0) {
      recommendations.push("High Drag Loss detected (>10%).");
      if (setupAnalysis.gpp > 9.0) {
        recommendations.push("-> Your arrow is heavy (High GPP). Consider lighter points for 50m.");
      }
      if ((this.arrow.shaft_diameter_mm ?? 0) > 6.0) {
        recommendations.push("-> Your arrow is thick. Wind drift is likely the cause.");
      }
    }

    return {
      safety: safetyWarnings,
      setup_score: setupAnalysis,
      performance_metrics: dragAnalysis,
      coach_recommendations: recommendations,
    };
  }
}
