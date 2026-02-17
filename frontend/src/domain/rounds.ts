/**
 * Round preset definitions and utilities for standard archery round types.
 * Ported from src/rounds.py — maintains identical data and function signatures.
 */

export interface RoundPreset {
  name: string;
  arrow_count: number;
  ends: number;
  arrows_per_end: number;
  distance_m: number;
  face_size_cm: number;
  max_score: number;
  scoring_type: "wa" | "field" | "flint";
  multi_distance: boolean;
}

const ROUND_PRESETS: Record<string, RoundPreset> = {
  // ── Indoor ──
  "WA 18m (Indoor)": {
    name: "WA 18m (Indoor)", arrow_count: 60, ends: 20, arrows_per_end: 3,
    distance_m: 18.0, face_size_cm: 40, max_score: 600, scoring_type: "wa", multi_distance: false,
  },
  "WA 25m (Indoor)": {
    name: "WA 25m (Indoor)", arrow_count: 60, ends: 20, arrows_per_end: 3,
    distance_m: 25.0, face_size_cm: 60, max_score: 600, scoring_type: "wa", multi_distance: false,
  },
  "Portsmouth": {
    name: "Portsmouth", arrow_count: 60, ends: 20, arrows_per_end: 3,
    distance_m: 18.0, face_size_cm: 60, max_score: 600, scoring_type: "wa", multi_distance: false,
  },
  "Bray I": {
    name: "Bray I", arrow_count: 30, ends: 10, arrows_per_end: 3,
    distance_m: 18.0, face_size_cm: 40, max_score: 300, scoring_type: "wa", multi_distance: false,
  },
  "Bray II": {
    name: "Bray II", arrow_count: 30, ends: 10, arrows_per_end: 3,
    distance_m: 25.0, face_size_cm: 60, max_score: 300, scoring_type: "wa", multi_distance: false,
  },
  "Lancaster Quali": {
    name: "Lancaster Quali", arrow_count: 60, ends: 20, arrows_per_end: 3,
    distance_m: 18.0, face_size_cm: 40, max_score: 600, scoring_type: "wa", multi_distance: false,
  },
  "IFAA Flint (Indoor)": {
    name: "IFAA Flint (Indoor)", arrow_count: 56, ends: 14, arrows_per_end: 4,
    distance_m: 20.0, face_size_cm: 35, max_score: 280, scoring_type: "flint", multi_distance: false,
  },
  // ── Outdoor ──
  "WA 30m": {
    name: "WA 30m", arrow_count: 36, ends: 6, arrows_per_end: 6,
    distance_m: 30.0, face_size_cm: 80, max_score: 360, scoring_type: "wa", multi_distance: false,
  },
  "WA 40m": {
    name: "WA 40m", arrow_count: 36, ends: 6, arrows_per_end: 6,
    distance_m: 40.0, face_size_cm: 80, max_score: 360, scoring_type: "wa", multi_distance: false,
  },
  "WA 50m (Barebow)": {
    name: "WA 50m (Barebow)", arrow_count: 72, ends: 12, arrows_per_end: 6,
    distance_m: 50.0, face_size_cm: 122, max_score: 720, scoring_type: "wa", multi_distance: false,
  },
  "WA 60m": {
    name: "WA 60m", arrow_count: 36, ends: 6, arrows_per_end: 6,
    distance_m: 60.0, face_size_cm: 122, max_score: 360, scoring_type: "wa", multi_distance: false,
  },
  "WA 70m (Recurve)": {
    name: "WA 70m (Recurve)", arrow_count: 72, ends: 12, arrows_per_end: 6,
    distance_m: 70.0, face_size_cm: 122, max_score: 720, scoring_type: "wa", multi_distance: false,
  },
  "Half WA 50m": {
    name: "Half WA 50m", arrow_count: 36, ends: 6, arrows_per_end: 6,
    distance_m: 50.0, face_size_cm: 122, max_score: 360, scoring_type: "wa", multi_distance: false,
  },
  // ── National / Practice ──
  "National (Barebow)": {
    name: "National (Barebow)", arrow_count: 48, ends: 8, arrows_per_end: 6,
    distance_m: 50.0, face_size_cm: 122, max_score: 480, scoring_type: "wa", multi_distance: false,
  },
  "Short National": {
    name: "Short National", arrow_count: 48, ends: 8, arrows_per_end: 6,
    distance_m: 40.0, face_size_cm: 122, max_score: 480, scoring_type: "wa", multi_distance: false,
  },
  "Practice (30 arrows)": {
    name: "Practice (30 arrows)", arrow_count: 30, ends: 10, arrows_per_end: 3,
    distance_m: 18.0, face_size_cm: 40, max_score: 300, scoring_type: "wa", multi_distance: false,
  },
  // ── Legacy aliases ──
  "WA 18m": {
    name: "WA 18m", arrow_count: 60, ends: 20, arrows_per_end: 3,
    distance_m: 18.0, face_size_cm: 40, max_score: 600, scoring_type: "wa", multi_distance: false,
  },
  "WA 25m": {
    name: "WA 25m", arrow_count: 60, ends: 20, arrows_per_end: 3,
    distance_m: 25.0, face_size_cm: 60, max_score: 600, scoring_type: "wa", multi_distance: false,
  },
  "WA 50m": {
    name: "WA 50m", arrow_count: 72, ends: 12, arrows_per_end: 6,
    distance_m: 50.0, face_size_cm: 122, max_score: 720, scoring_type: "wa", multi_distance: false,
  },
  "Indoor Field": {
    name: "Indoor Field", arrow_count: 60, ends: 20, arrows_per_end: 3,
    distance_m: 18.0, face_size_cm: 40, max_score: 300, scoring_type: "field", multi_distance: false,
  },
  "Flint": {
    name: "Flint", arrow_count: 56, ends: 14, arrows_per_end: 4,
    distance_m: 0.0, face_size_cm: 0, max_score: 280, scoring_type: "flint", multi_distance: true,
  },
};

/**
 * Lookup a round preset by name (case-insensitive).
 */
export function getRoundPreset(name: string): RoundPreset | null {
  for (const [key, preset] of Object.entries(ROUND_PRESETS)) {
    if (key.toLowerCase() === name.toLowerCase()) {
      return preset;
    }
  }
  return null;
}

/**
 * Get all defined round presets.
 */
export function getAllPresets(): RoundPreset[] {
  return Object.values(ROUND_PRESETS);
}

/**
 * Calculate maximum possible score for a round.
 */
export function getMaxScore(roundType: string, arrowCount: number): number {
  const preset = getRoundPreset(roundType);

  if (preset) {
    if (arrowCount === preset.arrow_count) {
      return preset.max_score;
    }
    if (preset.scoring_type === "field") return arrowCount * 5;
    if (preset.scoring_type === "wa") return arrowCount * 10;
    if (preset.scoring_type === "flint") return arrowCount * 5;
  }

  return arrowCount * 10;
}

/**
 * Calculate score as percentage of maximum possible.
 */
export function getScorePercentage(totalScore: number, roundType: string, arrowCount: number): number {
  const maxScore = getMaxScore(roundType, arrowCount);
  if (maxScore === 0) return 0.0;
  return (totalScore / maxScore) * 100.0;
}
