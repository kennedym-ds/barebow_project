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
  total_arrow_weight_gr: number;
  shaft_diameter_mm: number;
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
}

export type TabSetupCreate = Omit<TabSetup, 'id'>;
export type TabSetupUpdate = Partial<TabSetupCreate>;

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
  'WA 18m (Indoor)':   { dist: 18, face: 40, arrows_end: 3, total: 60, type: 'WA', x_11: false },
  'WA 25m (Indoor)':   { dist: 25, face: 60, arrows_end: 3, total: 60, type: 'WA', x_11: false },
  'WA 50m (Barebow)':  { dist: 50, face: 122, arrows_end: 6, total: 72, type: 'WA', x_11: false },
  'WA 70m (Recurve)':  { dist: 70, face: 122, arrows_end: 6, total: 72, type: 'WA', x_11: false },
  'IFAA Flint (Indoor)': { dist: 20, face: 35, arrows_end: 4, total: 56, type: 'Flint', x_11: false },
  'Lancaster Quali':   { dist: 18, face: 40, arrows_end: 3, total: 60, type: 'WA', x_11: true },
  'Custom':            { dist: 18, face: 40, arrows_end: 3, total: 30, type: 'WA', x_11: false },
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
