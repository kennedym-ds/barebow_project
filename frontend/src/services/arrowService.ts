/**
 * Arrow service — mirrors api/routers/arrows.py.
 * CRUD + shaft management + domain analytics/spine/optimize/similar.
 */

import type {
  ArrowSetup,
  ArrowSetupCreate,
  ArrowSetupUpdate,
  ArrowShaft,
  ShaftAnalyticsResponse,
  SpineCheckResponse,
  OptimizeRequest,
  OptimizedSetResponse,
  FindSimilarRequest,
  SimilarArrowResult,
  ShaftGradeEntry,
  ShaftOutlierEntry,
  GroupStatsResponse,
} from "../types/models";
import { arrowRepo, shaftRepo, bowRepo } from "../db";
import {
  gradeShaft,
  computeGroupStats,
  detectOutliers,
  findBestSets,
  findSimilarArrows,
  type ShaftData,
} from "../domain/arrowAnalytics";
import { checkSpineMatch } from "../domain/physics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toShaftData(shaft: ArrowShaft): ShaftData {
  return {
    arrow_number: shaft.arrow_number,
    measured_weight_gr: shaft.measured_weight_gr ?? undefined,
    measured_spine_astm: shaft.measured_spine_astm ?? undefined,
    straightness: shaft.straightness ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const arrowService = {
  // ── CRUD ──────────────────────────────────────────────────

  list(): ArrowSetup[] {
    return arrowRepo.list();
  },

  getById(id: string): ArrowSetup | null {
    return arrowRepo.getById(id);
  },

  create(data: ArrowSetupCreate): ArrowSetup {
    return arrowRepo.create(data);
  },

  update(id: string, data: ArrowSetupUpdate): ArrowSetup | null {
    return arrowRepo.update(id, data);
  },

  delete(id: string): boolean {
    return arrowRepo.delete(id);
  },

  // ── Shafts ────────────────────────────────────────────────

  listShafts(arrowId: string): ArrowShaft[] {
    return shaftRepo.listByArrowSetup(arrowId);
  },

  importShafts(
    arrowId: string,
    shafts: Omit<ArrowShaft, "id" | "arrow_setup_id">[]
  ): ArrowShaft[] {
    const arrow = arrowRepo.getById(arrowId);
    if (!arrow) throw new Error("Arrow setup not found");
    return shaftRepo.bulkCreate(
      arrowId,
      shafts.map((s) => ({
        arrow_number: s.arrow_number,
        measured_weight_gr: s.measured_weight_gr,
        measured_spine_astm: s.measured_spine_astm,
        straightness: s.straightness,
      }))
    );
  },

  deleteShafts(arrowId: string): void {
    shaftRepo.deleteByArrowSetup(arrowId);
  },

  // ── Analytics ─────────────────────────────────────────────

  getAnalytics(arrowId: string, outlierThreshold = 2.0): ShaftAnalyticsResponse {
    const arrow = arrowRepo.getById(arrowId);
    if (!arrow) throw new Error("Arrow setup not found");

    const shafts = shaftRepo.listByArrowSetup(arrowId);
    const shaftData = shafts.map(toShaftData);
    const measuredWeights = shaftData
      .filter((s) => s.measured_weight_gr != null)
      .map((s) => s.measured_weight_gr as number);
    const meanWeight = measuredWeights.length > 0
      ? measuredWeights.reduce((a, b) => a + b, 0) / measuredWeights.length
      : 0;

    // Grade each shaft
    const grades: ShaftGradeEntry[] = shafts.map((s) => {
      const weight = s.measured_weight_gr ?? meanWeight;
      const grade = gradeShaft(weight, meanWeight, s.straightness ?? null);
      return {
        arrow_number: s.arrow_number,
        grade,
        measured_weight_gr: s.measured_weight_gr ?? null,
        measured_spine_astm: s.measured_spine_astm ?? null,
        straightness: s.straightness ?? null,
      };
    });

    // Group statistics
    const stats = computeGroupStats(shaftData);
    const group_stats: GroupStatsResponse = {
      shaft_count: stats.shaft_count,
      weight: stats.weight
        ? { mean: stats.weight.mean, std: stats.weight.std, range: stats.weight.range, cv_pct: stats.weight.cv_pct }
        : null,
      spine: stats.spine
        ? { mean: stats.spine.mean, std: stats.spine.std, range: stats.spine.range, cv_pct: stats.spine.cv_pct }
        : null,
      straightness: stats.straightness
        ? {
            mean: stats.straightness.mean,
            std: stats.straightness.std,
            range: stats.straightness.range,
            cv_pct: stats.straightness.cv_pct,
          }
        : null,
    };

    // Outliers
    const outlierResults = detectOutliers(shaftData, outlierThreshold);
    const outliers: ShaftOutlierEntry[] = outlierResults.map((o) => ({
      arrow_number: o.arrow_number,
      feature: o.feature,
      value: o.value,
      z_score: o.z_score,
    }));

    return { grades, group_stats, outliers };
  },

  // ── Spine Check ───────────────────────────────────────────

  spineCheck(arrowId: string, bowId: string): SpineCheckResponse {
    const arrow = arrowRepo.getById(arrowId);
    if (!arrow) throw new Error("Arrow setup not found");
    const bow = bowRepo.getById(bowId);
    if (!bow) throw new Error("Bow setup not found");
    if (bow.draw_length_in == null) {
      throw new Error("Bow draw_length_in is required for spine check");
    }

    const result = checkSpineMatch(
      arrow.spine,
      bow.draw_weight_otf,
      bow.draw_length_in,
      arrow.point_weight_gr,
      arrow.length_in,
      bow.brace_height_in,
      bow.strand_count,
      arrow.total_arrow_weight_gr ?? undefined,
      arrow.shaft_diameter_mm ?? undefined,
    );
    return {
      status: result.status,
      recommended_spine: result.recommended_spine,
      actual_dynamic_spine: result.actual_dynamic_spine,
      deviation_pct: result.deviation_pct,
      effective_draw_weight: result.effective_draw_weight,
      message: result.message,
      frequency_match: result.frequency_match ?? null,
    };
  },

  // ── Optimize ──────────────────────────────────────────────

  optimize(arrowId: string, request: OptimizeRequest): OptimizedSetResponse[] {
    const arrow = arrowRepo.getById(arrowId);
    if (!arrow) throw new Error("Arrow setup not found");

    const shafts = shaftRepo.listByArrowSetup(arrowId);
    if (shafts.length < request.set_size) {
      throw new Error("Insufficient shafts for requested set size");
    }

    const shaftData = shafts.map(toShaftData);
    const results = findBestSets(
      shaftData,
      request.set_size,
      request.top_n,
      {
        weight: request.weight_priority,
        spine: request.spine_priority,
        straightness: request.straightness_priority,
      }
    );

    return results.map((r) => ({
      rank: r.rank,
      arrow_numbers: r.arrow_numbers,
      consistency_score: r.consistency_score,
      weight_std_gr: r.weight_std_gr,
      spine_std: r.spine_std,
      straightness_std: r.straightness_std,
    }));
  },

  // ── Find Similar ──────────────────────────────────────────

  findSimilar(arrowId: string, request: FindSimilarRequest): SimilarArrowResult[] {
    const arrow = arrowRepo.getById(arrowId);
    if (!arrow) throw new Error("Arrow setup not found");

    const shafts = shaftRepo.listByArrowSetup(arrowId);
    const shaftData = shafts.map(toShaftData);
    const referenceNumbers = new Set(request.reference_arrow_numbers);
    const referenceArrows = shaftData.filter((s) => referenceNumbers.has(s.arrow_number ?? -1));

    if (referenceArrows.length === 0) {
      return [];
    }

    const candidates = shaftData.filter((s) => !referenceNumbers.has(s.arrow_number ?? -1));

    const results = findSimilarArrows(
      referenceArrows,
      candidates,
      request.top_n
    );

    return results.map((r) => ({
      arrow_number: r.arrow_number,
      similarity_score: r.similarity_score,
      weight_diff_gr: r.weight_diff_gr,
      spine_diff: r.spine_diff,
      straightness_diff: r.straightness_diff,
    }));
  },
};
