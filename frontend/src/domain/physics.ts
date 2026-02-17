/**
 * Physics calculations for archery equipment analysis.
 * Ported from src/physics.py — pure math, no NumPy dependencies.
 *
 * Includes: GPP, FOC, safety analysis, setup efficiency scoring,
 * launch velocity, dynamic spine, flexural rigidity, natural frequency,
 * spine-frequency match, spine recommendation, and spine match checking.
 */

import type { BowSetup, ArrowSetup } from "../types/models";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GRAINS_PER_KG = 15432.358;
const INCHES_PER_METER = 39.3701;

// Reference values (ASTM / Easton baseline)
const REF_DRAW_LENGTH_IN = 28.0;
const REF_BRACE_HEIGHT_IN = 8.0;
const REF_POWER_STROKE_IN = REF_DRAW_LENGTH_IN - REF_BRACE_HEIGHT_IN; // 20"
const REF_POINT_WEIGHT_GR = 125.0;
const REF_STRAND_COUNT = 16;

// Spine chart: draw_weight_lbs → recommended spine
const SPINE_CHART: [number, number][] = [
  [20, 900], [22, 850], [25, 800], [27, 750], [30, 700],
  [35, 600], [40, 500], [45, 450], [50, 400], [55, 350],
  [60, 300], [70, 250],
];

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/** Calculates Grains Per Pound. */
export function calculateGpp(arrowWeightGr: number, drawWeightLbs: number): number {
  if (drawWeightLbs <= 0) return 0.0;
  return arrowWeightGr / drawWeightLbs;
}

/**
 * Calculates Front of Center (FOC) percentage using component estimation.
 * FOC% = 100 * (Balance Point - Length/2) / Length
 */
export function calculateFoc(
  arrowLengthIn: number,
  pointWeightGr: number,
  totalWeightGr: number,
  nockWeightGr = 10.0,
  fletchWeightGr = 15.0,
): number {
  if (arrowLengthIn <= 0 || totalWeightGr <= 0) return 0.0;

  let shaftWeightGr = totalWeightGr - pointWeightGr - nockWeightGr - fletchWeightGr;
  if (shaftWeightGr < 0) shaftWeightGr = 0;

  const mFletch = fletchWeightGr * 1.5;
  const mShaft = shaftWeightGr * (arrowLengthIn / 2.0);
  const mPoint = pointWeightGr * arrowLengthIn;

  const totalMoment = mFletch + mShaft + mPoint;
  const cgFromNock = totalMoment / totalWeightGr;
  const centerOfArrow = arrowLengthIn / 2.0;

  const focDecimal = (cgFromNock - centerOfArrow) / arrowLengthIn;
  return Math.round(focDecimal * 1000.0) / 10.0; // round to 1 decimal
}

/** Checks for dangerous configurations. */
export function analyzeSetupSafety(bow: BowSetup, arrow: ArrowSetup): string[] {
  const warnings: string[] = [];
  const gpp = calculateGpp(arrow.total_arrow_weight_gr ?? 0, bow.draw_weight_otf ?? 0);

  if (gpp < 5.0) {
    warnings.push("CRITICAL: GPP is below 5.0. Risk of limb failure (Dry Fire equivalent).");
  } else if (gpp < 7.0) {
    warnings.push("WARNING: GPP is below 7.0. Check limb manufacturer warranty.");
  }

  return warnings;
}

/**
 * Scores the equipment setup based on the 'Barebow Triangle' logic.
 * Returns a score (0-100) and feedback list.
 */
export function scoreSetupEfficiency(
  bow: BowSetup,
  arrow: ArrowSetup,
  discipline: "indoor" | "outdoor" = "indoor",
): { score: number; gpp: number; feedback: string[] } {
  let score = 100;
  const feedback: string[] = [];
  const gpp = calculateGpp(arrow.total_arrow_weight_gr ?? 0, bow.draw_weight_otf ?? 0);

  if (discipline === "indoor") {
    if (gpp < 8.0) {
      score -= 30;
      feedback.push(`GPP (${gpp.toFixed(1)}) is too low for Indoor. Consider heavier points to slow the shot and reduce gaps.`);
    } else if (gpp > 13.0) {
      score -= 10;
      feedback.push(`GPP (${gpp.toFixed(1)}) is very high. Ensure trajectory allows reaching 18m with good sight mark.`);
    } else {
      feedback.push("Excellent GPP for Indoor stability.");
    }

    if ((arrow.shaft_diameter_mm ?? 0) < 8.0) {
      score -= 10;
      feedback.push("Arrow is thin for Indoor. Consider 9.3mm shafts for line-cutting.");
    }
  } else {
    if (gpp > 9.0) {
      score -= 20;
      feedback.push(`GPP (${gpp.toFixed(1)}) is heavy for Outdoor. You may struggle with 50m sight marks.`);
    } else if (gpp < 6.0) {
      score -= 30;
      feedback.push("GPP is critically low.");
    }

    if ((arrow.shaft_diameter_mm ?? 0) > 6.0) {
      score -= 15;
      feedback.push("Arrow diameter is large for Outdoor. Wind drift will be significant.");
    }
  }

  return {
    score: Math.max(0, score),
    gpp: Math.round(gpp * 100) / 100,
    feedback,
  };
}

// ---------------------------------------------------------------------------
// Launch velocity estimation
// ---------------------------------------------------------------------------

/**
 * Estimate arrow launch velocity in feet per second.
 * Uses simplified energy-balance method.
 */
export function estimateLaunchVelocity(
  drawWeightLbs: number,
  drawLengthIn: number,
  arrowWeightGr: number,
  bowEfficiency = 0.80,
  stringMassGr = 60.0,
): number {
  if (drawWeightLbs <= 0 || drawLengthIn <= 0 || arrowWeightGr <= 0) return 0.0;

  const forceN = drawWeightLbs * 4.44822;
  const drawM = drawLengthIn / INCHES_PER_METER;
  const arrowKg = arrowWeightGr / GRAINS_PER_KG;
  const stringKg = stringMassGr / GRAINS_PER_KG;

  const storedEnergyJ = 0.5 * forceN * drawM;
  const kineticEnergyJ = bowEfficiency * storedEnergyJ;

  const effectiveMassKg = arrowKg + stringKg / 3.0;
  if (effectiveMassKg <= 0) return 0.0;

  const velocityMps = Math.sqrt((2.0 * kineticEnergyJ) / effectiveMassKg);
  const velocityFps = velocityMps * 3.28084;
  return Math.round(velocityFps * 10) / 10;
}

// ---------------------------------------------------------------------------
// Dynamic spine — Energy-corrected multiplicative model
// ---------------------------------------------------------------------------

/**
 * Estimate dynamic spine using the energy-corrected multiplicative model.
 * S_dynamic = S_static × C_length × C_point × C_draw_length × C_brace_height × C_string
 */
export function calculateDynamicSpine(
  staticSpine: number,
  arrowLengthIn: number,
  pointWeightGr: number,
  drawWeightLbs: number,
  drawLengthIn = 28.0,
  braceHeightIn = 8.0,
  strandCount = 16,
): number {
  if (staticSpine <= 0 || drawWeightLbs <= 0) return 0.0;

  const cLength = 1.0 + ((arrowLengthIn - REF_DRAW_LENGTH_IN) / REF_DRAW_LENGTH_IN) * 1.5;
  const cPoint = 1.0 + ((pointWeightGr - REF_POINT_WEIGHT_GR) / REF_POINT_WEIGHT_GR) * 0.4;
  const cDrawLength = drawLengthIn / REF_DRAW_LENGTH_IN;
  const powerStroke = Math.max(drawLengthIn - braceHeightIn, 10.0);
  const cBraceHeight = powerStroke / REF_POWER_STROKE_IN;
  const cString = Math.max(1.0 - 0.003 * (strandCount - REF_STRAND_COUNT), 0.90);

  const dynamic = staticSpine * cLength * cPoint * cDrawLength * cBraceHeight * cString;
  return Math.round(Math.max(dynamic, 50.0) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Flexural rigidity
// ---------------------------------------------------------------------------

/**
 * Calculate flexural rigidity (EI) in N·m² from ASTM spine and shaft diameter.
 * EI = F · L³ / (48 · δ)
 */
export function calculateFlexuralRigidity(spineAstm: number, shaftDiameterMm: number): number {
  if (spineAstm <= 0 || shaftDiameterMm <= 0) return 0.0;

  const forceN = 0.880 * 9.81;
  const spanM = 28.0 / INCHES_PER_METER;
  const deflectionM = (spineAstm / 1000.0) * (1.0 / INCHES_PER_METER);

  if (deflectionM <= 0) return 0.0;

  const ei = (forceN * Math.pow(spanM, 3)) / (48.0 * deflectionM);
  return Math.round(ei * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Arrow natural frequency & spine-frequency match
// ---------------------------------------------------------------------------

/**
 * Calculate fundamental natural frequency (Hz) of the arrow in free-free vibration.
 * Euler-Bernoulli beam theory.
 */
export function arrowNaturalFrequency(
  spineAstm: number,
  shaftDiameterMm: number,
  totalWeightGr: number,
  arrowLengthIn: number,
): number {
  if (spineAstm <= 0 || shaftDiameterMm <= 0 || totalWeightGr <= 0 || arrowLengthIn <= 0) return 0.0;

  const ei = calculateFlexuralRigidity(spineAstm, shaftDiameterMm);
  if (ei <= 0) return 0.0;

  const massKg = totalWeightGr / GRAINS_PER_KG;
  const lengthM = arrowLengthIn / INCHES_PER_METER;
  const mu = massKg / lengthM; // linear mass density

  const beta1L = 1.506 * Math.PI;
  const beta1 = beta1L / lengthM;
  const omega1 = Math.pow(beta1, 2) * Math.sqrt(ei / mu);
  const freqHz = omega1 / (2.0 * Math.PI);
  return Math.round(freqHz * 10) / 10;
}

export interface SpineFrequencyMatchResult {
  match_quality: string;
  oscillations_during_power_stroke: number;
  arrow_frequency_hz: number;
  power_stroke_duration_ms: number;
  message: string;
}

/**
 * Check if the arrow's vibration frequency matches the power-stroke timing.
 * Proper spine matching ≈ arrow completes ~1 full oscillation during power stroke.
 */
export function spineFrequencyMatch(
  arrowFreqHz: number,
  drawLengthIn: number,
  braceHeightIn: number,
  launchVelocityFps: number,
): SpineFrequencyMatchResult {
  if (arrowFreqHz <= 0 || launchVelocityFps <= 0) {
    return {
      match_quality: "unknown",
      oscillations_during_power_stroke: 0.0,
      arrow_frequency_hz: 0.0,
      power_stroke_duration_ms: 0.0,
      message: "Insufficient data for frequency analysis",
    };
  }

  const psIn = Math.max(drawLengthIn - braceHeightIn, 5.0);
  const psFt = psIn / 12.0;
  const avgVFps = launchVelocityFps / 2.0;
  const psDurationS = psFt / avgVFps;
  const oscillations = arrowFreqHz * psDurationS;

  let quality: string;
  let msg: string;

  if (oscillations >= 0.8 && oscillations <= 1.2) {
    quality = "excellent";
    msg = `Arrow completes ${oscillations.toFixed(2)} oscillations — near-ideal paradox clearance`;
  } else if (oscillations >= 0.6 && oscillations <= 1.4) {
    quality = "good";
    msg = `Arrow completes ${oscillations.toFixed(2)} oscillations — acceptable clearance`;
  } else if (oscillations < 0.6) {
    quality = "too_stiff";
    msg = `Arrow completes only ${oscillations.toFixed(2)} oscillations — too stiff, won't flex around riser`;
  } else {
    quality = "too_weak";
    msg = `Arrow completes ${oscillations.toFixed(2)} oscillations — too weak, excessive flexing`;
  }

  return {
    match_quality: quality,
    oscillations_during_power_stroke: Math.round(oscillations * 100) / 100,
    arrow_frequency_hz: Math.round(arrowFreqHz * 10) / 10,
    power_stroke_duration_ms: Math.round(psDurationS * 100000) / 100,
    message: msg,
  };
}

// ---------------------------------------------------------------------------
// Spine recommendation & matching
// ---------------------------------------------------------------------------

function interpolateSpine(drawWeightLbs: number): number {
  if (drawWeightLbs <= SPINE_CHART[0][0]) return SPINE_CHART[0][1];
  if (drawWeightLbs >= SPINE_CHART[SPINE_CHART.length - 1][0]) return SPINE_CHART[SPINE_CHART.length - 1][1];

  for (let i = 0; i < SPINE_CHART.length - 1; i++) {
    const [w0, s0] = SPINE_CHART[i];
    const [w1, s1] = SPINE_CHART[i + 1];
    if (drawWeightLbs >= w0 && drawWeightLbs <= w1) {
      const t = (drawWeightLbs - w0) / (w1 - w0);
      return s0 + t * (s1 - s0);
    }
  }
  return SPINE_CHART[SPINE_CHART.length - 1][1];
}

export interface SpineRecommendation {
  recommended_spine: number;
  effective_draw_weight: number;
  range_low: number;
  range_high: number;
  notes: string[];
}

/**
 * Recommend optimal spine range using the energy-corrected model.
 */
export function recommendSpine(
  drawWeightLbs: number,
  drawLengthIn: number,
  pointWeightGr: number,
  arrowLengthIn: number,
  braceHeightIn = 8.0,
  strandCount = 16,
): SpineRecommendation {
  if (drawWeightLbs <= 0) {
    return {
      recommended_spine: 0,
      effective_draw_weight: 0.0,
      range_low: 0,
      range_high: 0,
      notes: ["Invalid draw weight"],
    };
  }

  const cDrawLength = drawLengthIn / REF_DRAW_LENGTH_IN;
  const powerStroke = Math.max(drawLengthIn - braceHeightIn, 10.0);
  const cBrace = powerStroke / REF_POWER_STROKE_IN;
  const cString = Math.max(1.0 - 0.003 * (strandCount - REF_STRAND_COUNT), 0.90);

  const effWeight = drawWeightLbs * cDrawLength * cBrace * cString;
  const baseSpine = interpolateSpine(effWeight);

  const notes: string[] = [];

  const cLength = 1.0 + ((arrowLengthIn - REF_DRAW_LENGTH_IN) / REF_DRAW_LENGTH_IN) * 1.5;
  const cPoint = 1.0 + ((pointWeightGr - REF_POINT_WEIGHT_GR) / REF_POINT_WEIGHT_GR) * 0.4;

  if (Math.abs(arrowLengthIn - REF_DRAW_LENGTH_IN) >= 0.5) {
    const direction = arrowLengthIn > REF_DRAW_LENGTH_IN ? "weaker" : "stiffer";
    notes.push(`Arrow length ${arrowLengthIn}" — effective spine is ${direction} vs 28" ref`);
  }

  if (Math.abs(pointWeightGr - REF_POINT_WEIGHT_GR) >= 10) {
    const direction = pointWeightGr > REF_POINT_WEIGHT_GR ? "weaker" : "stiffer";
    notes.push(`Point weight ${pointWeightGr} gr — effective spine is ${direction} vs 125 gr ref`);
  }

  if (Math.abs(drawLengthIn - REF_DRAW_LENGTH_IN) >= 0.5) {
    notes.push(`Draw length ${drawLengthIn}" (effective draw weight ${effWeight.toFixed(1)} lbs)`);
  }

  if (Math.abs(braceHeightIn - REF_BRACE_HEIGHT_IN) >= 0.25) {
    const direction = braceHeightIn < REF_BRACE_HEIGHT_IN ? "more force" : "less force";
    notes.push(`Brace height ${braceHeightIn}" — ${direction} than 8" reference`);
  }

  if (strandCount !== REF_STRAND_COUNT) {
    notes.push(`String strand count ${strandCount} (ref 16)`);
  }

  const adjusted = baseSpine * cLength * cPoint;
  const recommended = Math.round(adjusted / 10) * 10;
  const rangeLow = Math.max(recommended - 40, 200);
  const rangeHigh = recommended + 40;

  if (notes.length === 0) {
    notes.push("Standard setup — no significant adjustments needed");
  }

  return {
    recommended_spine: recommended,
    effective_draw_weight: Math.round(effWeight * 10) / 10,
    range_low: rangeLow,
    range_high: rangeHigh,
    notes,
  };
}

export interface SpineMatchResult {
  status: string;
  recommended_spine: number;
  effective_draw_weight: number;
  actual_dynamic_spine: number;
  deviation_pct: number;
  message: string;
  frequency_match: SpineFrequencyMatchResult | null;
}

/**
 * Check if actual spine matches recommendation using energy-corrected model.
 * Optionally performs natural-frequency analysis.
 */
export function checkSpineMatch(
  actualSpine: number,
  drawWeightLbs: number,
  drawLengthIn: number,
  pointWeightGr: number,
  arrowLengthIn: number,
  braceHeightIn = 8.0,
  strandCount = 16,
  totalArrowWeightGr?: number,
  shaftDiameterMm?: number,
): SpineMatchResult {
  const rec = recommendSpine(drawWeightLbs, drawLengthIn, pointWeightGr, arrowLengthIn, braceHeightIn, strandCount);
  const recommended = rec.recommended_spine;

  if (recommended === 0) {
    return {
      status: "unknown",
      recommended_spine: 0,
      effective_draw_weight: 0.0,
      actual_dynamic_spine: actualSpine,
      deviation_pct: 0.0,
      message: "Cannot determine recommendation — check bow parameters",
      frequency_match: null,
    };
  }

  const dynamic = calculateDynamicSpine(
    actualSpine, arrowLengthIn, pointWeightGr, drawWeightLbs, drawLengthIn, braceHeightIn, strandCount,
  );
  const deviationPct = ((dynamic - recommended) / recommended) * 100.0;

  let status: string;
  let message: string;

  if (Math.abs(deviationPct) <= 10) {
    status = "matched";
    message = `Spine is well-matched (dynamic ${dynamic.toFixed(0)} vs recommended ${recommended})`;
  } else if (deviationPct > 10 && deviationPct <= 20) {
    status = "slightly_weak";
    message = `Spine may be slightly weak — dynamic ${dynamic.toFixed(0)} vs recommended ${recommended}`;
  } else if (deviationPct > 20) {
    status = "too_weak";
    message = `Spine is too weak — dynamic ${dynamic.toFixed(0)} vs recommended ${recommended}. Consider stiffer shafts.`;
  } else if (deviationPct >= -20 && deviationPct < -10) {
    status = "slightly_stiff";
    message = `Spine may be slightly stiff — dynamic ${dynamic.toFixed(0)} vs recommended ${recommended}`;
  } else {
    status = "too_stiff";
    message = `Spine is too stiff — dynamic ${dynamic.toFixed(0)} vs recommended ${recommended}. Consider weaker shafts.`;
  }

  // Optional frequency analysis
  let freqResult: SpineFrequencyMatchResult | null = null;
  if (totalArrowWeightGr && shaftDiameterMm) {
    const freqHz = arrowNaturalFrequency(actualSpine, shaftDiameterMm, totalArrowWeightGr, arrowLengthIn);
    if (freqHz > 0) {
      const launchV = estimateLaunchVelocity(drawWeightLbs, drawLengthIn, totalArrowWeightGr);
      if (launchV > 0) {
        freqResult = spineFrequencyMatch(freqHz, drawLengthIn, braceHeightIn, launchV);
      }
    }
  }

  return {
    status,
    recommended_spine: recommended,
    effective_draw_weight: rec.effective_draw_weight,
    actual_dynamic_spine: Math.round(dynamic * 10) / 10,
    deviation_pct: Math.round(deviationPct * 10) / 10,
    message,
    frequency_match: freqResult,
  };
}
