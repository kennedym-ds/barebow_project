/**
 * Analytics service — mirrors api/routers/analytics/ (summary, precision, trends, goals).
 * Replicates all 16 analytics endpoints with inline computation + domain function calls.
 *
 * Data comes from sessionRepo + domain functions instead of SQLAlchemy + Python.
 */

import { getDatabase } from "../db/database";
import { getRoundPreset } from "../domain/rounds";
import { calculateSigmaFromScore, predictScoreAtDistance } from "../domain/parkModel";
import {
  computeDrms,
  computeR95,
  computeExtremeSpread,
  computeRayleighSigmaWithCi,
  computeAccuracyPrecisionRatio,
  computeConfidenceEllipse,
  detectFliers,
  computeEwma,
  computePracticeConsistency,
  computeWithinEndTrend,
  computeHitProbability,
  computeEquipmentComparison,
} from "../domain/precision";

// ---------------------------------------------------------------------------
// Re-export analytics response interfaces from the API hooks for convenience.
// These are the shapes callers (hooks) already expect.
// ---------------------------------------------------------------------------

import type {
  SessionSummaryStats,
  ShotDetailRecord,
  PersonalBest,
  ParkModelAnalysis,
  BiasAnalysis,
  SessionScoreContext,
  AdvancedPrecision,
  TrendAnalysis,
  WithinEndAnalysis,
  HitProbabilityAnalysis,
  EquipmentComparison,
  DashboardStats,
  ScoreGoalSimulation,
  ArrowPerformanceSummary,
  ArrowPerformance,
  ArrowTier,
  EndScore,
  ConsistencyByRound,
} from "../api/analytics";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface RawSession {
  id: string;
  date: string;
  round_type: string;
  distance_m: number;
  target_face_size_cm: number;
  bow_id: string | null;
  arrow_id: string | null;
  notes: string;
}

interface RawShot {
  id: string;
  end_id: string;
  score: number;
  is_x: number; // 0 or 1 from SQLite
  x: number;
  y: number;
  arrow_number: number | null;
  shot_sequence: number;
}

interface RawEnd {
  id: string;
  session_id: string;
  end_number: number;
}

/**
 * Filter params common to most analytics endpoints.
 */
interface AnalyticsFilters {
  roundTypes?: string[];
  fromDate?: string;
  toDate?: string;
}

/**
 * Query sessions with optional filters.
 * Returns raw session rows (no eager loading — we load ends/shots separately).
 */
function querySessions(filters: AnalyticsFilters): RawSession[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters.roundTypes?.length) {
    const placeholders = filters.roundTypes.map((_, i) => `:rt${i}`);
    conditions.push(`round_type IN (${placeholders.join(",")})`);
    filters.roundTypes.forEach((rt, i) => {
      params[`:rt${i}`] = rt;
    });
  }
  if (filters.fromDate) {
    conditions.push("date >= :from_date");
    params[":from_date"] = filters.fromDate;
  }
  if (filters.toDate) {
    conditions.push("date <= :to_date");
    params[":to_date"] = filters.toDate;
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM session${where} ORDER BY date DESC`;

  const stmt = db.prepare(sql);
  if (Object.keys(params).length > 0) stmt.bind(params);

  const results: RawSession[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as RawSession);
  }
  stmt.free();
  return results;
}

function getEndsForSession(sessionId: string): RawEnd[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM "end" WHERE session_id = :sid ORDER BY end_number');
  stmt.bind({ ":sid": sessionId });
  const results: RawEnd[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as RawEnd);
  }
  stmt.free();
  return results;
}

function getShotsForEnd(endId: string): RawShot[] {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM shot WHERE end_id = :eid ORDER BY shot_sequence, arrow_number"
  );
  stmt.bind({ ":eid": endId });
  const results: RawShot[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as RawShot);
  }
  stmt.free();
  return results;
}

function getAllShotsForSession(sessionId: string): (RawShot & { end_number: number })[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT sh.*, e.end_number
    FROM shot sh
    JOIN "end" e ON sh.end_id = e.id
    WHERE e.session_id = :sid
    ORDER BY e.end_number, sh.shot_sequence, sh.arrow_number
  `);
  stmt.bind({ ":sid": sessionId });
  const results: (RawShot & { end_number: number })[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as (RawShot & { end_number: number }));
  }
  stmt.free();
  return results;
}

function getBowName(bowId: string | null): string | null {
  if (!bowId) return null;
  const db = getDatabase();
  const stmt = db.prepare("SELECT name FROM bowsetup WHERE id = :id");
  stmt.bind({ ":id": bowId });
  let name: string | null = null;
  if (stmt.step()) {
    name = (stmt.getAsObject() as { name: string }).name;
  }
  stmt.free();
  return name;
}

function getArrowName(arrowId: string | null): string | null {
  if (!arrowId) return null;
  const db = getDatabase();
  const stmt = db.prepare("SELECT make, model FROM arrowsetup WHERE id = :id");
  stmt.bind({ ":id": arrowId });
  let name: string | null = null;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { make: string; model: string };
    name = `${row.make} ${row.model}`;
  }
  stmt.free();
  return name;
}

/** Compute standard deviation (population, ddof=0) */
function std(arr: number[]): number {
  if (arr.length === 0) return 0;
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

/** Compute variance (population, ddof=0) */
function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  return arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
}

/** Compute mean */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Percentile (linear interpolation) */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

/** Pearson correlation coefficient */
function corrcoef(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx;
    const yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  const denom = Math.sqrt(dx * dy);
  return denom < 1e-12 ? 0 : num / denom;
}

/** Simple linear regression slope */
function polyfitSlope(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, denom = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx;
    num += xi * (y[i] - my);
    denom += xi * xi;
  }
  return denom < 1e-12 ? 0 : num / denom;
}

/** 8-direction compass from atan2 */
function compassDirection(x: number, y: number): string {
  const angle = Math.atan2(y, x);
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  const dirs = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const analyticsService = {
  // ─── Summary Module ─────────────────────────────────────────────────

  summary(filters: AnalyticsFilters): SessionSummaryStats[] {
    const sessions = querySessions(filters);
    const results: SessionSummaryStats[] = [];

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      const shotCount = shots.length;
      if (shotCount === 0) continue;

      const totalScore = shots.reduce((a, s) => a + s.score, 0);
      const avgScore = totalScore / shotCount;
      const xs = shots.map((s) => s.x);
      const ys = shots.map((s) => s.y);
      const rDists = shots.map((s) => Math.sqrt(s.x ** 2 + s.y ** 2));

      results.push({
        session_id: session.id,
        date: session.date,
        round_type: session.round_type,
        distance_m: session.distance_m,
        face_cm: session.target_face_size_cm,
        total_score: totalScore,
        shot_count: shotCount,
        avg_score: Math.round(avgScore * 100) / 100,
        mean_radius: Math.round(mean(rDists) * 100) / 100,
        sigma_x: Math.round(std(xs) * 100) / 100,
        sigma_y: Math.round(std(ys) * 100) / 100,
        cep_50: Math.round(percentile(rDists, 50) * 100) / 100,
        bow_name: getBowName(session.bow_id),
        arrow_name: getArrowName(session.arrow_id),
      });
    }

    return results;
  },

  shots(filters: AnalyticsFilters): ShotDetailRecord[] {
    const sessions = querySessions(filters);
    const results: ShotDetailRecord[] = [];

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      for (const shot of shots) {
        results.push({
          session_id: session.id,
          session_date: session.date,
          round_type: session.round_type,
          end_number: shot.end_number,
          arrow_number: shot.arrow_number,
          score: shot.score,
          is_x: Boolean(shot.is_x),
          x: shot.x,
          y: shot.y,
          face_size: session.target_face_size_cm,
        });
      }
    }

    return results;
  },

  personalBests(): PersonalBest[] {
    const sessions = querySessions({});
    const byRound = new Map<string, { total: number; avg: number; date: string; id: string }>();

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      if (shots.length === 0) continue;
      const total = shots.reduce((a, s) => a + s.score, 0);
      const avg = total / shots.length;

      const existing = byRound.get(session.round_type);
      if (!existing || total > existing.total) {
        byRound.set(session.round_type, {
          total,
          avg: Math.round(avg * 100) / 100,
          date: session.date,
          id: session.id,
        });
      }
    }

    return Array.from(byRound.entries())
      .map(([rt, data]) => ({
        round_type: rt,
        total_score: data.total,
        avg_score: data.avg,
        date: data.date,
        session_id: data.id,
      }))
      .sort((a, b) => b.total_score - a.total_score);
  },

  scoreContext(filters: AnalyticsFilters): SessionScoreContext[] {
    const sessions = querySessions(filters);
    const results: SessionScoreContext[] = [];

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      if (shots.length === 0) continue;

      const totalScore = shots.reduce((a, s) => a + s.score, 0);
      const shotCount = shots.length;
      const avgScore = totalScore / shotCount;
      const faceCm = session.target_face_size_cm;

      const preset = getRoundPreset(session.round_type);
      const maxScore = preset ? preset.max_score : shotCount * 10;
      const presetArrowCount = preset ? preset.arrow_count : null;
      const roundComplete = preset ? shotCount >= preset.arrow_count : false;

      const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const sigmaCm = calculateSigmaFromScore(avgScore, faceCm);

      const rDists = shots.map((s) => Math.sqrt(s.x ** 2 + s.y ** 2));
      const cep50 = shotCount > 1 ? percentile(rDists, 50) : 0;

      results.push({
        session_id: session.id,
        date: session.date,
        round_type: session.round_type,
        distance_m: session.distance_m,
        total_score: totalScore,
        shot_count: shotCount,
        avg_score: Math.round(avgScore * 100) / 100,
        max_score: maxScore,
        score_percentage: Math.round(scorePercentage * 100) / 100,
        sigma_cm: Math.round(sigmaCm * 100) / 100,
        cep_50: Math.round(cep50 * 100) / 100,
        preset_arrow_count: presetArrowCount,
        round_complete: roundComplete,
      });
    }

    return results;
  },

  dashboard(): DashboardStats {
    const sessions = querySessions({});
    if (sessions.length === 0) {
      return {
        total_sessions: 0,
        total_arrows: 0,
        days_since_last_practice: null,
        last_session_score: null,
        last_session_round: null,
        last_session_date: null,
        rolling_avg_score: null,
        personal_best_score: null,
        personal_best_round: null,
        personal_best_date: null,
        sparkline_dates: [],
        sparkline_scores: [],
      };
    }

    // Compute per-session stats
    const sessionStats: Array<{
      id: string;
      date: string;
      roundType: string;
      totalScore: number;
      shotCount: number;
      avgArrowScore: number;
    }> = [];

    let totalArrows = 0;

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      if (shots.length === 0) continue;
      const total = shots.reduce((a, s) => a + s.score, 0);
      totalArrows += shots.length;
      sessionStats.push({
        id: session.id,
        date: session.date,
        roundType: session.round_type,
        totalScore: total,
        shotCount: shots.length,
        avgArrowScore: total / shots.length,
      });
    }

    if (sessionStats.length === 0) {
      return {
        total_sessions: sessions.length,
        total_arrows: 0,
        days_since_last_practice: null,
        last_session_score: null,
        last_session_round: null,
        last_session_date: null,
        rolling_avg_score: null,
        personal_best_score: null,
        personal_best_round: null,
        personal_best_date: null,
        sparkline_dates: [],
        sparkline_scores: [],
      };
    }

    // Sessions are date desc — most recent first
    const latest = sessionStats[0];

    // Days since last
    const daysSinceLast = Math.round(
      (Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Personal best (by total score)
    const pb = sessionStats.reduce((best, s) =>
      s.totalScore > best.totalScore ? s : best
    );

    // Rolling average — EWMA with span=10
    const chronological = [...sessionStats].reverse();
    const alpha = 2.0 / (10 + 1);
    let ewma = chronological[0].avgArrowScore;
    for (let i = 1; i < chronological.length; i++) {
      ewma = alpha * chronological[i].avgArrowScore + (1 - alpha) * ewma;
    }

    // Sparkline: last 20 sessions in chronological order
    const sparkline = chronological.slice(-20);

    return {
      total_sessions: sessions.length,
      total_arrows: totalArrows,
      days_since_last_practice: daysSinceLast,
      last_session_score: latest.totalScore,
      last_session_round: latest.roundType,
      last_session_date: latest.date,
      rolling_avg_score: Math.round(ewma * 100) / 100,
      personal_best_score: pb.totalScore,
      personal_best_round: pb.roundType,
      personal_best_date: pb.date,
      sparkline_dates: sparkline.map((s) => s.date),
      sparkline_scores: sparkline.map((s) => Math.round(s.avgArrowScore * 100) / 100),
    };
  },

  // ─── Precision Module ───────────────────────────────────────────────

  biasAnalysis(filters: AnalyticsFilters): BiasAnalysis {
    const sessions = querySessions(filters);
    const allX: number[] = [];
    const allY: number[] = [];
    const faceSizes: number[] = [];
    const endScoreMap = new Map<number, number[]>();
    const firstArrowScores: number[] = [];
    const otherArrowScores: number[] = [];

    for (const session of sessions) {
      const ends = getEndsForSession(session.id);
      for (const end of ends) {
        const shots = getShotsForEnd(end.id);
        const endScores: number[] = [];
        for (let idx = 0; idx < shots.length; idx++) {
          const shot = shots[idx];
          allX.push(shot.x);
          allY.push(shot.y);
          faceSizes.push(session.target_face_size_cm);
          endScores.push(shot.score);

          if (idx === 0) {
            firstArrowScores.push(shot.score);
          } else {
            otherArrowScores.push(shot.score);
          }
        }
        if (endScores.length > 0) {
          const existing = endScoreMap.get(end.end_number) ?? [];
          existing.push(mean(endScores));
          endScoreMap.set(end.end_number, existing);
        }
      }
    }

    if (allX.length === 0) {
      return emptyBiasAnalysis();
    }

    const avgFaceSize = mean(faceSizes);
    const faceRadius = avgFaceSize / 2.0;

    // MPI
    const mpiX = mean(allX);
    const mpiY = mean(allY);
    const mpiXNorm = faceRadius > 0 ? mpiX / faceRadius : 0;
    const mpiYNorm = faceRadius > 0 ? mpiY / faceRadius : 0;

    // Directional bias
    const biasMagCm = Math.sqrt(mpiX ** 2 + mpiY ** 2);
    const biasMagNorm = faceRadius > 0 ? biasMagCm / faceRadius : 0;
    const biasDirection = biasMagNorm < 0.02 ? "Center" : compassDirection(mpiX, mpiY);

    // H/V ratio
    const sigmaX = std(allX);
    const sigmaY = std(allY);
    const hvRatio = sigmaY > 1e-6 ? sigmaX / sigmaY : 1.0;
    let hvInterpretation: string;
    if (hvRatio > 1.2) hvInterpretation = "Horizontal dispersion dominant";
    else if (hvRatio < 0.8) hvInterpretation = "Vertical dispersion dominant";
    else hvInterpretation = "Balanced dispersion";

    // End fatigue
    const endNums: number[] = [];
    const avgEndScores: number[] = [];
    for (const [num, scores] of endScoreMap.entries()) {
      endNums.push(num);
      avgEndScores.push(mean(scores));
    }
    const fatigueCorr = endNums.length >= 2 ? corrcoef(endNums, avgEndScores) : 0;
    const fatigueSlope = endNums.length >= 2 ? polyfitSlope(endNums, avgEndScores) : 0;
    let fatigueInterpretation: string;
    if (fatigueCorr < -0.7) fatigueInterpretation = "Strong fatigue effect — scores decline significantly";
    else if (fatigueCorr < -0.4) fatigueInterpretation = "Mild fatigue effect";
    else fatigueInterpretation = "No significant fatigue detected";

    // End scores for chart
    const endScoreList: EndScore[] = Array.from(endScoreMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, scores]) => ({
        end_number: num,
        avg_score: Math.round(mean(scores) * 100) / 100,
        shot_count: scores.length,
      }));

    // First arrow penalty
    const firstAvg = firstArrowScores.length > 0 ? mean(firstArrowScores) : 0;
    const otherAvg = otherArrowScores.length > 0 ? mean(otherArrowScores) : 0;
    const firstPenalty = firstAvg - otherAvg;
    let firstArrowInterpretation: string;
    if (firstPenalty < -0.3) firstArrowInterpretation = "First arrow penalty detected";
    else if (firstPenalty > 0.3) firstArrowInterpretation = "First arrow advantage detected";
    else firstArrowInterpretation = "No significant first arrow effect";

    return {
      total_shots: allX.length,
      mpi_x_cm: Math.round(mpiX * 100) / 100,
      mpi_y_cm: Math.round(mpiY * 100) / 100,
      mpi_x_normalized: Math.round(mpiXNorm * 1000) / 1000,
      mpi_y_normalized: Math.round(mpiYNorm * 1000) / 1000,
      bias_direction: biasDirection,
      bias_magnitude_cm: Math.round(biasMagCm * 100) / 100,
      bias_magnitude_normalized: Math.round(biasMagNorm * 1000) / 1000,
      sigma_x_cm: Math.round(sigmaX * 100) / 100,
      sigma_y_cm: Math.round(sigmaY * 100) / 100,
      hv_ratio: Math.round(hvRatio * 100) / 100,
      hv_interpretation: hvInterpretation,
      fatigue_slope: Math.round(fatigueSlope * 1000) / 1000,
      fatigue_correlation: Math.round(fatigueCorr * 1000) / 1000,
      fatigue_interpretation: fatigueInterpretation,
      end_scores: endScoreList,
      first_arrow_avg: Math.round(firstAvg * 100) / 100,
      other_arrows_avg: Math.round(otherAvg * 100) / 100,
      first_arrow_penalty: Math.round(firstPenalty * 100) / 100,
      first_arrow_interpretation: firstArrowInterpretation,
    };
  },

  advancedPrecision(filters: AnalyticsFilters): AdvancedPrecision {
    const sessions = querySessions(filters);
    const allX: number[] = [];
    const allY: number[] = [];
    const faceSizes: number[] = [];

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      for (const shot of shots) {
        allX.push(shot.x);
        allY.push(shot.y);
        faceSizes.push(session.target_face_size_cm);
      }
    }

    if (allX.length < 3) {
      return emptyAdvancedPrecision(allX.length);
    }

    const drms = computeDrms(allX, allY);
    const r95 = computeR95(allX, allY);
    const extremeSpread = computeExtremeSpread(allX, allY);
    const rayleigh = computeRayleighSigmaWithCi(allX, allY);
    const accuracy = computeAccuracyPrecisionRatio(allX, allY);

    // Normalize for ellipse
    const avgFaceSize = mean(faceSizes);
    const halfFace = avgFaceSize / 2.0;
    const xNorm = allX.map((x) => x / halfFace);
    const yNorm = allY.map((y) => y / halfFace);
    const ellipse = computeConfidenceEllipse(xNorm, yNorm);

    const fliers = detectFliers(allX, allY);

    return {
      total_shots: allX.length,
      drms_cm: Math.round(drms * 100) / 100,
      r95_cm: Math.round(r95 * 100) / 100,
      extreme_spread_cm: Math.round(extremeSpread * 100) / 100,
      rayleigh_sigma: rayleigh.sigma,
      rayleigh_ci_lower: rayleigh.ci_lower,
      rayleigh_ci_upper: rayleigh.ci_upper,
      accuracy_pct: accuracy.accuracy_pct,
      precision_pct: accuracy.precision_pct,
      accuracy_precision_interpretation: accuracy.interpretation,
      ellipse_center_x: ellipse.center_x,
      ellipse_center_y: ellipse.center_y,
      ellipse_semi_major: ellipse.semi_major,
      ellipse_semi_minor: ellipse.semi_minor,
      ellipse_angle_deg: ellipse.angle_deg,
      ellipse_correlation: ellipse.correlation,
      flier_count: fliers.flier_count,
      flier_pct: fliers.flier_pct,
      clean_sigma: fliers.clean_sigma,
      full_sigma: fliers.full_sigma,
      flier_interpretation: fliers.interpretation,
    };
  },

  withinEnd(filters: AnalyticsFilters): WithinEndAnalysis {
    const sessions = querySessions(filters);
    const shotsByPosition: Record<number, number[]> = {};
    let totalEnds = 0;
    const arrowsPerEndCounts: number[] = [];

    for (const session of sessions) {
      const ends = getEndsForSession(session.id);
      for (const end of ends) {
        const shots = getShotsForEnd(end.id);
        totalEnds++;
        arrowsPerEndCounts.push(shots.length);
        for (let i = 0; i < shots.length; i++) {
          if (!shotsByPosition[i]) shotsByPosition[i] = [];
          shotsByPosition[i].push(shots[i].score);
        }
      }
    }

    if (Object.keys(shotsByPosition).length === 0) {
      return {
        positions: [],
        best_position: 0,
        worst_position: 0,
        interpretation: "No data",
        total_ends: 0,
        arrows_per_end_mode: 0,
      };
    }

    const trendResult = computeWithinEndTrend(shotsByPosition);

    // Mode of arrows per end
    const freqMap = new Map<number, number>();
    for (const c of arrowsPerEndCounts) {
      freqMap.set(c, (freqMap.get(c) ?? 0) + 1);
    }
    let mode = 0, maxFreq = 0;
    for (const [k, v] of freqMap.entries()) {
      if (v > maxFreq) { mode = k; maxFreq = v; }
    }

    return {
      ...trendResult,
      total_ends: totalEnds,
      arrows_per_end_mode: mode,
    };
  },

  hitProbability(roundType: string, filters: Omit<AnalyticsFilters, "roundTypes">): HitProbabilityAnalysis {
    const sessions = querySessions({ ...filters, roundTypes: [roundType] });
    const allX: number[] = [];
    const allY: number[] = [];
    const faceSizes: number[] = [];

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      for (const shot of shots) {
        allX.push(shot.x);
        allY.push(shot.y);
        faceSizes.push(session.target_face_size_cm);
      }
    }

    if (allX.length === 0) {
      return {
        round_type: roundType,
        total_shots: 0,
        sigma_x_cm: 0,
        sigma_y_cm: 0,
        mpi_x_cm: 0,
        mpi_y_cm: 0,
        face_size_cm: 0,
        ring_probs: [],
        expected_score: 0,
      };
    }

    const sigmaX = std(allX);
    const sigmaY = std(allY);
    const mpiX = mean(allX);
    const mpiY = mean(allY);
    const faceSizeCm = Math.round(mean(faceSizes));

    const hitResult = computeHitProbability(sigmaX, sigmaY, mpiX, mpiY, faceSizeCm);

    return {
      round_type: roundType,
      total_shots: allX.length,
      sigma_x_cm: Math.round(sigmaX * 100) / 100,
      sigma_y_cm: Math.round(sigmaY * 100) / 100,
      mpi_x_cm: Math.round(mpiX * 100) / 100,
      mpi_y_cm: Math.round(mpiY * 100) / 100,
      face_size_cm: faceSizeCm,
      ring_probs: hitResult.ring_probs,
      expected_score: hitResult.expected_score,
    };
  },

  // ─── Trends Module ──────────────────────────────────────────────────

  parkModel(
    shortRoundType: string,
    longRoundType: string,
    filters: Omit<AnalyticsFilters, "roundTypes">
  ): ParkModelAnalysis {
    const shortSessions = querySessions({ ...filters, roundTypes: [shortRoundType] });
    const longSessions = querySessions({ ...filters, roundTypes: [longRoundType] });

    // Compute averages
    const shortStats = computeSessionGroupStats(shortSessions);
    const longStats = computeSessionGroupStats(longSessions);

    if (shortStats.count === 0 || longStats.count === 0) {
      throw new Error("Need sessions for both short and long rounds");
    }

    const shortPreset = getRoundPreset(shortRoundType);
    const longPreset = getRoundPreset(longRoundType);
    const shortFace = shortPreset?.face_size_cm ?? shortSessions[0].target_face_size_cm;
    const longFace = longPreset?.face_size_cm ?? longSessions[0].target_face_size_cm;
    const shortDist = shortPreset?.distance_m ?? shortSessions[0].distance_m;
    const longDist = longPreset?.distance_m ?? longSessions[0].distance_m;

    const shortSigma = calculateSigmaFromScore(shortStats.avgScore, shortFace);
    const longSigma = calculateSigmaFromScore(longStats.avgScore, longFace);

    const [predictedLong, predictedLongSigma] = predictScoreAtDistance(
      shortStats.avgScore, shortDist, shortFace, longDist, longFace
    );

    const sigmaThetaRad = shortSigma / (shortDist * 100.0);
    const sigmaThetaMrad = sigmaThetaRad * 1000.0;
    const dragLoss = predictedLong - longStats.avgScore;
    const dragLossPct = predictedLong > 0 ? (dragLoss / predictedLong) * 100.0 : 0;

    return {
      short_round: shortRoundType,
      short_avg_score: Math.round(shortStats.avgScore * 100) / 100,
      short_session_count: shortStats.count,
      short_sigma_cm: Math.round(shortSigma * 100) / 100,
      long_round: longRoundType,
      long_avg_score: Math.round(longStats.avgScore * 100) / 100,
      long_session_count: longStats.count,
      long_sigma_cm: Math.round(longSigma * 100) / 100,
      predicted_long_score: Math.round(predictedLong * 100) / 100,
      predicted_long_sigma: Math.round(predictedLongSigma * 100) / 100,
      drag_loss_points: Math.round(dragLoss * 100) / 100,
      drag_loss_percent: Math.round(dragLossPct * 100) / 100,
      sigma_theta_mrad: Math.round(sigmaThetaMrad * 100) / 100,
    };
  },

  trends(filters: AnalyticsFilters): TrendAnalysis {
    const sessions = querySessions(filters);
    const dates: string[] = [];
    const roundTypes: string[] = [];
    const scores: number[] = [];
    const sigmas: number[] = [];
    const totalScoresByRound = new Map<string, number[]>();

    // Process in chronological order
    const chronological = [...sessions].reverse();

    for (const session of chronological) {
      const shots = getAllShotsForSession(session.id);
      if (shots.length === 0) continue;

      const totalScore = shots.reduce((a, s) => a + s.score, 0);
      const avgScore = totalScore / shots.length;
      const xs = shots.map((s) => s.x);
      const ys = shots.map((s) => s.y);
      const sigma = Math.sqrt(variance(xs) + variance(ys));

      dates.push(session.date);
      roundTypes.push(session.round_type);
      scores.push(Math.round(avgScore * 100) / 100);
      sigmas.push(Math.round(sigma * 100) / 100);

      const byRound = totalScoresByRound.get(session.round_type) ?? [];
      byRound.push(totalScore);
      totalScoresByRound.set(session.round_type, byRound);
    }

    // EWMA for scores and sigmas
    const scoreEwma = scores.length >= 2
      ? computeEwma(scores, 0.2)
      : { ewma: scores, ucl: scores, lcl: scores, mean: scores[0] ?? 0, sigma: 0 };
    const sigmaEwma = sigmas.length >= 2
      ? computeEwma(sigmas, 0.3)
      : { ewma: sigmas, ucl: sigmas, lcl: sigmas, mean: sigmas[0] ?? 0, sigma: 0 };

    // Consistency per round type
    const consistency: ConsistencyByRound[] = [];
    for (const [rt, totalScores] of totalScoresByRound.entries()) {
      const result = computePracticeConsistency(totalScores);
      consistency.push({
        round_type: rt,
        cv: result.cv,
        mean: result.mean,
        std: result.std,
        interpretation: result.interpretation,
        session_count: totalScores.length,
      });
    }

    return {
      dates,
      round_types: roundTypes,
      scores,
      sigmas,
      score_ewma: scoreEwma.ewma,
      score_ucl: scoreEwma.ucl,
      score_lcl: scoreEwma.lcl,
      sigma_ewma: sigmaEwma.ewma,
      sigma_ucl: sigmaEwma.ucl,
      sigma_lcl: sigmaEwma.lcl,
      consistency,
    };
  },

  equipmentComparison(
    setupABowId?: string,
    setupAArrowId?: string,
    setupBBowId?: string,
    setupBArrowId?: string,
    roundType?: string,
    fromDate?: string,
    toDate?: string
  ): EquipmentComparison {
    function getSetupStats(bowId?: string, arrowId?: string) {
      const filters: AnalyticsFilters = {
        roundTypes: roundType ? [roundType] : undefined,
        fromDate,
        toDate,
      };
      let sessions = querySessions(filters);
      if (bowId) sessions = sessions.filter((s) => s.bow_id === bowId);
      if (arrowId) sessions = sessions.filter((s) => s.arrow_id === arrowId);

      const avgScores: number[] = [];
      const sigmaValues: number[] = [];

      for (const session of sessions) {
        const shots = getAllShotsForSession(session.id);
        if (shots.length === 0) continue;
        const total = shots.reduce((a, s) => a + s.score, 0);
        const avgScore = total / shots.length;
        const xs = shots.map((s) => s.x);
        const ys = shots.map((s) => s.y);
        const sigma = Math.sqrt(variance(xs) + variance(ys));
        avgScores.push(avgScore);
        sigmaValues.push(sigma);
      }

      return { scores: avgScores, sigmas: sigmaValues, count: sessions.length };
    }

    const a = getSetupStats(setupABowId, setupAArrowId);
    const b = getSetupStats(setupBBowId, setupBArrowId);

    const nameA = [
      setupABowId ? getBowName(setupABowId) : null,
      setupAArrowId ? getArrowName(setupAArrowId) : null,
    ].filter(Boolean).join(" + ") || "Setup A";

    const nameB = [
      setupBBowId ? getBowName(setupBBowId) : null,
      setupBArrowId ? getArrowName(setupBArrowId) : null,
    ].filter(Boolean).join(" + ") || "Setup B";

    if (a.scores.length < 2 || b.scores.length < 2) {
      return {
        setup_a: nameA,
        setup_b: nameB,
        setup_a_sessions: a.count,
        setup_b_sessions: b.count,
        score_diff: 0,
        score_p_value: 1,
        score_cohens_d: 0,
        sigma_diff: 0,
        sigma_p_value: 1,
        score_significant: false,
        sigma_significant: false,
        interpretation: "Insufficient data for comparison (need 2+ sessions each)",
      };
    }

    const result = computeEquipmentComparison(
      a.scores, a.sigmas, nameA,
      b.scores, b.sigmas, nameB
    );

    return {
      ...result,
      setup_a_sessions: a.count,
      setup_b_sessions: b.count,
    };
  },

  // ─── Goals Module ───────────────────────────────────────────────────

  scoreGoal(
    goalTotalScore: number,
    totalArrows = 30,
    distanceM = 18,
    faceCm = 40,
    roundType?: string
  ): ScoreGoalSimulation {
    const goalAvgArrow = Math.min(goalTotalScore / totalArrows, 10.0);
    const requiredSigma = calculateSigmaFromScore(goalAvgArrow, faceCm);

    // Get current sigma from recent data
    let currentSigma: number | null = null;
    let currentAvgArrow: number | null = null;
    let sigmaImprovement: number | null = null;

    const filters: AnalyticsFilters = {
      roundTypes: roundType ? [roundType] : undefined,
    };
    const sessions = querySessions(filters);
    const allX: number[] = [];
    const allY: number[] = [];
    let totalScore = 0;

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      for (const shot of shots) {
        allX.push(shot.x);
        allY.push(shot.y);
        totalScore += shot.score;
      }
    }

    if (allX.length > 0) {
      const sx = std(allX);
      const sy = std(allY);
      currentSigma = Math.sqrt(sx ** 2 + sy ** 2) / Math.sqrt(2);
      currentAvgArrow = totalScore / allX.length;
      if (currentSigma > 0) {
        sigmaImprovement = ((currentSigma - requiredSigma) / currentSigma) * 100.0;
      }
    }

    const feasible = requiredSigma > 0;
    let interpretation: string;
    if (!currentSigma) {
      interpretation = "No session data available for comparison";
    } else if (sigmaImprovement !== null && sigmaImprovement <= 0) {
      interpretation = "You are already at or beyond this goal!";
    } else if (sigmaImprovement !== null && sigmaImprovement < 10) {
      interpretation = "Very achievable — small improvement needed";
    } else if (sigmaImprovement !== null && sigmaImprovement < 25) {
      interpretation = "Achievable with dedicated practice";
    } else if (sigmaImprovement !== null && sigmaImprovement < 50) {
      interpretation = "Ambitious — significant work required";
    } else {
      interpretation = "Very ambitious — long-term goal";
    }

    return {
      goal_total_score: goalTotalScore,
      goal_avg_arrow: Math.round(goalAvgArrow * 100) / 100,
      required_sigma_cm: Math.round(requiredSigma * 100) / 100,
      current_sigma_cm: currentSigma !== null ? Math.round(currentSigma * 100) / 100 : null,
      current_avg_arrow: currentAvgArrow !== null ? Math.round(currentAvgArrow * 100) / 100 : null,
      sigma_improvement_pct: sigmaImprovement !== null ? Math.round(sigmaImprovement * 100) / 100 : null,
      distance_m: distanceM,
      face_cm: faceCm,
      feasible,
      interpretation,
    };
  },

  arrowPerformance(
    roundType?: string,
    fromDate?: string,
    toDate?: string,
    groupSize = 6
  ): ArrowPerformanceSummary {
    const sessions = querySessions({
      roundTypes: roundType ? [roundType] : undefined,
      fromDate,
      toDate,
    });

    const arrowMap = new Map<number, {
      scores: number[];
      radii: number[];
      xCount: number;
      tenCount: number;
      missCount: number;
      shots: Array<{ x: number; y: number; score: number; is_x: boolean }>;
    }>();
    let totalWithNumber = 0;
    let totalWithoutNumber = 0;
    let allFaceCm = 0;
    let faceCount = 0;

    for (const session of sessions) {
      const shots = getAllShotsForSession(session.id);
      for (const shot of shots) {
        if (shot.arrow_number != null && shot.arrow_number > 0) {
          totalWithNumber++;
          const num = shot.arrow_number;
          if (!arrowMap.has(num)) {
            arrowMap.set(num, { scores: [], radii: [], xCount: 0, tenCount: 0, missCount: 0, shots: [] });
          }
          const entry = arrowMap.get(num)!;
          const radius = Math.sqrt(shot.x ** 2 + shot.y ** 2);
          entry.scores.push(shot.score);
          entry.radii.push(radius);
          if (shot.is_x) entry.xCount++;
          if (shot.score === 10) entry.tenCount++;
          if (shot.score === 0) entry.missCount++;
          entry.shots.push({
            x: shot.x,
            y: shot.y,
            score: shot.score,
            is_x: Boolean(shot.is_x),
          });
        } else {
          totalWithoutNumber++;
        }
        allFaceCm += session.target_face_size_cm;
        faceCount++;
      }
    }

    const faceCm = faceCount > 0 ? Math.round(allFaceCm / faceCount) : 40;

    if (arrowMap.size === 0) {
      return {
        arrows: [],
        best_arrow: null,
        worst_arrow: null,
        total_shots_with_number: 0,
        total_shots_without_number: totalWithoutNumber,
        interpretation: "No arrow-numbered shots found",
        face_cm: faceCm,
        tiers: [],
        primary_set: [],
        group_size: groupSize,
      };
    }

    // Build per-arrow stats
    const arrows: ArrowPerformance[] = [];
    for (const [num, data] of arrowMap.entries()) {
      const avgScore = mean(data.scores);
      const stdScore = std(data.scores);
      const avgRadius = mean(data.radii);
      const precisionScore = 0.6 * avgRadius + 0.4 * stdScore;

      arrows.push({
        arrow_number: num,
        total_shots: data.scores.length,
        avg_score: Math.round(avgScore * 100) / 100,
        std_score: Math.round(stdScore * 100) / 100,
        avg_radius: Math.round(avgRadius * 100) / 100,
        x_count: data.xCount,
        ten_count: data.tenCount,
        miss_count: data.missCount,
        shots: data.shots,
        precision_score: Math.round(precisionScore * 100) / 100,
        precision_rank: 0, // assigned below
        tier: "reserve", // assigned below
      });
    }

    // Sort by precision_score ascending (lower is better)
    arrows.sort((a, b) => a.precision_score - b.precision_score);

    // Assign ranks and tiers
    for (let i = 0; i < arrows.length; i++) {
      arrows[i].precision_rank = i + 1;
      if (i < groupSize) {
        arrows[i].tier = "primary";
      } else if (i < groupSize + Math.ceil((arrows.length - groupSize) / 2)) {
        arrows[i].tier = "secondary";
      } else {
        arrows[i].tier = "reserve";
      }
    }

    // Build tier summaries
    const tierGroups: Record<string, ArrowPerformance[]> = { primary: [], secondary: [], reserve: [] };
    for (const a of arrows) {
      tierGroups[a.tier].push(a);
    }

    const tiers: ArrowTier[] = [];
    const tierLabels: Record<string, string> = {
      primary: "Primary Set",
      secondary: "Secondary Set",
      reserve: "Reserve",
    };
    for (const [name, label] of Object.entries(tierLabels)) {
      const group = tierGroups[name];
      if (group.length > 0) {
        tiers.push({
          name,
          label,
          arrow_numbers: group.map((a) => a.arrow_number),
          avg_precision_score: Math.round(mean(group.map((a) => a.precision_score)) * 100) / 100,
          avg_score: Math.round(mean(group.map((a) => a.avg_score)) * 100) / 100,
          avg_radius: Math.round(mean(group.map((a) => a.avg_radius)) * 100) / 100,
        });
      }
    }

    const bestArrow = arrows.length > 0 ? arrows[0].arrow_number : null;
    const worstArrow = arrows.length > 0 ? arrows[arrows.length - 1].arrow_number : null;
    const primarySet = arrows.filter((a) => a.tier === "primary").map((a) => a.arrow_number);

    // Interpretation
    const spread = arrows.length > 1
      ? arrows[arrows.length - 1].precision_score - arrows[0].precision_score
      : 0;
    let interpretation: string;
    if (spread < 0.3) interpretation = "Arrows are very consistent — minimal performance difference";
    else if (spread < 0.7) interpretation = "Some arrows underperform slightly — consider rotating out weakest";
    else interpretation = "Significant performance variation — some arrows are significantly weaker";

    return {
      arrows,
      best_arrow: bestArrow,
      worst_arrow: worstArrow,
      total_shots_with_number: totalWithNumber,
      total_shots_without_number: totalWithoutNumber,
      interpretation,
      face_cm: faceCm,
      tiers,
      primary_set: primarySet,
      group_size: groupSize,
    };
  },
};

// ---------------------------------------------------------------------------
// Helper: compute avg arrow score across sessions
// ---------------------------------------------------------------------------

function computeSessionGroupStats(sessions: RawSession[]): {
  count: number;
  avgScore: number;
  totalShots: number;
} {
  let totalScore = 0;
  let totalShots = 0;

  for (const session of sessions) {
    const shots = getAllShotsForSession(session.id);
    totalScore += shots.reduce((a, s) => a + s.score, 0);
    totalShots += shots.length;
  }

  return {
    count: sessions.length,
    avgScore: totalShots > 0 ? totalScore / totalShots : 0,
    totalShots,
  };
}

// ---------------------------------------------------------------------------
// Empty result factories
// ---------------------------------------------------------------------------

function emptyBiasAnalysis(): BiasAnalysis {
  return {
    total_shots: 0,
    mpi_x_cm: 0, mpi_y_cm: 0, mpi_x_normalized: 0, mpi_y_normalized: 0,
    bias_direction: "Center", bias_magnitude_cm: 0, bias_magnitude_normalized: 0,
    sigma_x_cm: 0, sigma_y_cm: 0, hv_ratio: 1, hv_interpretation: "No data",
    fatigue_slope: 0, fatigue_correlation: 0, fatigue_interpretation: "No data",
    end_scores: [], first_arrow_avg: 0, other_arrows_avg: 0,
    first_arrow_penalty: 0, first_arrow_interpretation: "No data",
  };
}

function emptyAdvancedPrecision(totalShots: number): AdvancedPrecision {
  return {
    total_shots: totalShots,
    drms_cm: 0, r95_cm: 0, extreme_spread_cm: 0,
    rayleigh_sigma: 0, rayleigh_ci_lower: 0, rayleigh_ci_upper: 0,
    accuracy_pct: 0, precision_pct: 0, accuracy_precision_interpretation: "Insufficient data",
    ellipse_center_x: 0, ellipse_center_y: 0, ellipse_semi_major: 0, ellipse_semi_minor: 0,
    ellipse_angle_deg: 0, ellipse_correlation: 0,
    flier_count: 0, flier_pct: 0, clean_sigma: 0, full_sigma: 0,
    flier_interpretation: "Insufficient data",
  };
}
