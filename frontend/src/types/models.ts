// ─── Equipment Types ─────────────────────────────────────

export interface BowSetup {
  id: string;
  name: string;
  riser_make: string;
  riser_model: string;
  riser_length_in: number;
  limbs_make: string;
  limbs_model: string;
  limbs_length: string;
  limbs_marked_poundage: number;
  draw_weight_otf: number;
  draw_length_in: number | null;
  brace_height_in: number;
  tiller_top_mm: number;
  tiller_bottom_mm: number;
  tiller_type: string;
  nocking_point_height_mm: number;
  plunger_center_shot_mm: number;
  plunger_spring_tension: number;
  string_material: string;
  strand_count: number;
  limb_alignment: string;
  total_mass_g: number;
  riser_weights: string;
}

export type BowSetupCreate = Omit<BowSetup, 'id'>;
export type BowSetupUpdate = Partial<BowSetupCreate>;

export interface ArrowSetup {
  id: string;
  make: string;
  model: string;
  spine: number;
  length_in: number;
  point_weight_gr: number;
  total_arrow_weight_gr: number | null;
  shaft_diameter_mm: number | null;
  fletching_type: string;
  nock_type: string;
  arrow_count: number;
}

export type ArrowSetupCreate = Omit<ArrowSetup, 'id'>;
export type ArrowSetupUpdate = Partial<ArrowSetupCreate>;

export interface ArrowShaft {
  id?: string;
  arrow_setup_id: string;
  arrow_number: number;
  measured_weight_gr: number | null;
  measured_spine_astm: number | null;
  straightness: number | null;
}

export interface TabSetup {
  id: string;
  name: string;
  make: string;
  model: string;
  marks: string;
  tab_image_path: string | null;
  nock_y_px: number | null;
  scale_mm_per_px: number | null;
}

export type TabSetupCreate = Omit<TabSetup, 'id' | 'tab_image_path' | 'nock_y_px' | 'scale_mm_per_px'>;
export type TabSetupUpdate = Partial<TabSetupCreate & Pick<TabSetup, 'nock_y_px' | 'scale_mm_per_px'>>;

// ─── Session & Shot Types ────────────────────────────────

export type FaceType = 'WA' | 'Flint';

export interface Shot {
  id: string;
  end_id: string;
  score: number;
  is_x: boolean;
  x: number;
  y: number;
  arrow_number: number | null;
}

export interface End {
  id: string;
  session_id: string;
  end_number: number;
  shots: Shot[];
}

export interface Session {
  id: string;
  date: string;
  bow_id: string | null;
  arrow_id: string | null;
  round_type: string;
  target_face_size_cm: number;
  distance_m: number;
  notes: string;
  ends: End[];
  bow: { id: string; name: string } | null;
  arrow: { id: string; make: string; model: string; spine: number } | null;
}

export interface SessionCreate {
  bow_id?: string;
  arrow_id?: string;
  round_type: string;
  target_face_size_cm: number;
  distance_m: number;
  notes?: string;
}

export interface ShotData {
  score: number;
  is_x: boolean;
  x: number;
  y: number;
  arrow_number?: number;
}

export interface EndCreate {
  end_number: number;
  shots: ShotData[];
}

// ─── Session Summary ─────────────────────────────────────

export interface SessionSummary {
  id: string;
  date: string;
  round_type: string;
  distance_m: number;
  target_face_size_cm: number;
  total_score: number;
  shot_count: number;
  avg_score: number;
  bow_name: string | null;
  arrow_name: string | null;
}

// ─── Analysis Types ──────────────────────────────────────

export interface ScorePredictionRequest {
  known_score: number;
  known_distance_m: number;
  known_face_cm: number;
  target_distance_m: number;
  target_face_cm: number;
}

export interface ScorePredictionResponse {
  predicted_score: number;
  predicted_sigma: number;
}

export interface SetupEfficiencyRequest {
  bow_id: string;
  arrow_id: string;
  discipline: 'indoor' | 'outdoor';
}

export interface CrawlRequest {
  known_distances: number[];
  known_crawls: number[];
}

export interface CrawlPrediction {
  distance: number;
  crawl_mm: number;
}

export interface CrawlChartResponse {
  chart: CrawlPrediction[];
  coefficients: number[];
}

// ─── Round Definitions ───────────────────────────────────

export interface RoundDefinition {
  dist: number;
  face: number;
  arrows_end: number;
  total: number;
  type: FaceType;
  x_11: boolean;
}

export const ROUND_DEFINITIONS: Record<string, RoundDefinition> = {
  // ── Indoor ──
  'WA 18m (Indoor)':     { dist: 18, face: 40, arrows_end: 3, total: 60, type: 'WA', x_11: false },
  'WA 25m (Indoor)':     { dist: 25, face: 60, arrows_end: 3, total: 60, type: 'WA', x_11: false },
  'Portsmouth':          { dist: 18, face: 60, arrows_end: 3, total: 60, type: 'WA', x_11: false },
  'Bray I':              { dist: 18, face: 40, arrows_end: 3, total: 30, type: 'WA', x_11: false },
  'Bray II':             { dist: 25, face: 60, arrows_end: 3, total: 30, type: 'WA', x_11: false },
  'Lancaster Quali':     { dist: 18, face: 40, arrows_end: 3, total: 60, type: 'WA', x_11: true },
  'IFAA Flint (Indoor)': { dist: 20, face: 35, arrows_end: 4, total: 56, type: 'Flint', x_11: false },
  // ── Outdoor ──
  'WA 30m':              { dist: 30, face: 80, arrows_end: 6, total: 36, type: 'WA', x_11: false },
  'WA 40m':              { dist: 40, face: 80, arrows_end: 6, total: 36, type: 'WA', x_11: false },
  'WA 50m (Barebow)':    { dist: 50, face: 122, arrows_end: 6, total: 72, type: 'WA', x_11: false },
  'WA 60m':              { dist: 60, face: 122, arrows_end: 6, total: 36, type: 'WA', x_11: false },
  'WA 70m (Recurve)':    { dist: 70, face: 122, arrows_end: 6, total: 72, type: 'WA', x_11: false },
  'Half WA 50m':         { dist: 50, face: 122, arrows_end: 6, total: 36, type: 'WA', x_11: false },
  // ── National / Practice ──
  'National (Barebow)':  { dist: 50, face: 122, arrows_end: 6, total: 48, type: 'WA', x_11: false },
  'Short National':      { dist: 40, face: 122, arrows_end: 6, total: 48, type: 'WA', x_11: false },
  'Practice (30 arrows)':{ dist: 18, face: 40, arrows_end: 3, total: 30, type: 'WA', x_11: false },
  'Custom':              { dist: 18, face: 40, arrows_end: 3, total: 30, type: 'WA', x_11: false },
};

// ─── Analytics ───────────────────────────────────────────

export interface AnalyticsSummary {
  id: string;
  date: string;
  round_type: string;
  distance_m: number;
  target_face_size_cm: number;
  total_score: number;
  shot_count: number;
  avg_score: number;
  cep_50: number;
  sigma: number;
  bow_name: string | null;
  arrow_name: string | null;
}

export interface ShotDetail {
  session_date: string;
  round: string;
  end_number: number;
  arrow_number: string;
  score: number;
  x: number;
  y: number;
  face_size: number;
}

export interface PersonalBest {
  round_type: string;
  score: number;
  date: string;
}

// ---------------------------------------------------------------------------
// Arrow Analytics
// ---------------------------------------------------------------------------

export interface ShaftGradeEntry {
  arrow_number: number;
  grade: string;
  measured_weight_gr: number | null;
  measured_spine_astm: number | null;
  straightness: number | null;
}

export interface MetricStats {
  mean: number;
  std: number;
  range: number;
  cv_pct: number;
}

export interface GroupStatsResponse {
  shaft_count: number;
  weight: MetricStats | null;
  spine: MetricStats | null;
  straightness: MetricStats | null;
}

export interface ShaftOutlierEntry {
  arrow_number: number;
  feature: string;
  value: number;
  z_score: number;
}

export interface ShaftAnalyticsResponse {
  grades: ShaftGradeEntry[];
  group_stats: GroupStatsResponse;
  outliers: ShaftOutlierEntry[];
}

// ---------------------------------------------------------------------------
// Spine Check
// ---------------------------------------------------------------------------

export interface FrequencyMatchResponse {
  match_quality: string;
  oscillations_during_power_stroke: number;
  arrow_frequency_hz: number;
  power_stroke_duration_ms: number;
  message: string;
}

export interface SpineCheckResponse {
  status: string;
  recommended_spine: number;
  actual_dynamic_spine: number;
  deviation_pct: number;
  effective_draw_weight: number;
  message: string;
  frequency_match: FrequencyMatchResponse | null;
}

// ---------------------------------------------------------------------------
// Set Optimizer
// ---------------------------------------------------------------------------

export interface OptimizeRequest {
  set_size: number;
  top_n: number;
  weight_priority: number;
  spine_priority: number;
  straightness_priority: number;
}

export interface OptimizedSetResponse {
  rank: number;
  arrow_numbers: number[];
  consistency_score: number;
  weight_std_gr: number;
  spine_std: number;
  straightness_std: number;
}

// ---------------------------------------------------------------------------
// Find Similar
// ---------------------------------------------------------------------------

export interface FindSimilarRequest {
  reference_arrow_numbers: number[];
  top_n: number;
}

export interface SimilarArrowResult {
  arrow_number: number;
  similarity_score: number;
  weight_diff_gr: number;
  spine_diff: number;
  straightness_diff: number;
}

// ---------------------------------------------------------------------------
// Trajectory
// ---------------------------------------------------------------------------

export interface TrajectoryPoint {
  t: number;
  x_m: number;
  y_m: number;
  v_mps: number;
}

export interface TrajectoryRequest {
  launch_velocity_fps: number;
  target_distance_m: number;
  arrow_mass_gr: number;
  shaft_diameter_mm: number;
  arrow_length_in: number;
  target_elevation_deg?: number;
  drag_coefficient?: number;
}

export interface TrajectoryResponse {
  launch_angle_deg: number;
  target_elevation_deg: number;
  trajectory: TrajectoryPoint[];
  max_height_m: number;
  range_m: number;
  time_of_flight_s: number;
  impact_velocity_mps: number;
  impact_angle_deg: number;
  drop_at_distances: Record<string, number>;
}

export interface DriftRequest {
  launch_velocity_fps: number;
  arrow_mass_gr: number;
  shaft_diameter_mm: number;
  arrow_length_in: number;
  target_distance_m: number;
  crosswind_speed_mps: number;
  drag_coefficient?: number;
}

export interface DriftResponse {
  drift_cm: number;
  drift_rings: number;
  time_of_flight_s: number;
  advice: string;
}
