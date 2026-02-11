import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

// Match the API response schemas from api/routers/analytics.py

export interface SessionSummaryStats {
  session_id: string;
  date: string;
  round_type: string;
  distance_m: number;
  face_cm: number;
  total_score: number;
  shot_count: number;
  avg_score: number;
  mean_radius: number;
  sigma_x: number;
  sigma_y: number;
  cep_50: number;
  bow_name: string | null;
  arrow_name: string | null;
}

export interface ShotDetailRecord {
  session_id: string;
  session_date: string;
  round_type: string;
  end_number: number;
  arrow_number: number | null;
  score: number;
  is_x: boolean;
  x: number;
  y: number;
  face_size: number;
}

export interface PersonalBest {
  round_type: string;
  total_score: number;
  avg_score: number;
  date: string;
  session_id: string;
}

export function useAnalyticsSummary(roundTypes?: string[], fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (roundTypes?.length) params.set('round_type', roundTypes.join(','));
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  const qs = params.toString();
  return useQuery({
    queryKey: ['analytics', 'summary', roundTypes, fromDate, toDate],
    queryFn: () => apiFetch<SessionSummaryStats[]>(`/api/analytics/summary${qs ? '?' + qs : ''}`),
  });
}

export function useAnalyticsShots(roundTypes?: string[], fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (roundTypes?.length) params.set('round_type', roundTypes.join(','));
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  const qs = params.toString();
  return useQuery({
    queryKey: ['analytics', 'shots', roundTypes, fromDate, toDate],
    queryFn: () => apiFetch<ShotDetailRecord[]>(`/api/analytics/shots${qs ? '?' + qs : ''}`),
  });
}

export function usePersonalBests() {
  return useQuery({
    queryKey: ['analytics', 'personal-bests'],
    queryFn: () => apiFetch<PersonalBest[]>('/api/analytics/personal-bests'),
  });
}

// ─── New Types for Analytics Upgrades ────────────────────

export interface ParkModelAnalysis {
  short_round: string;
  short_avg_score: number;
  short_session_count: number;
  short_sigma_cm: number;
  long_round: string;
  long_avg_score: number;
  long_session_count: number;
  long_sigma_cm: number;
  predicted_long_score: number;
  predicted_long_sigma: number;
  drag_loss_points: number;
  drag_loss_percent: number;
  sigma_theta_mrad: number;
}

export interface EndScore {
  end_number: number;
  avg_score: number;
  shot_count: number;
}

export interface BiasAnalysis {
  total_shots: number;
  mpi_x_cm: number;
  mpi_y_cm: number;
  mpi_x_normalized: number;
  mpi_y_normalized: number;
  bias_direction: string;
  bias_magnitude_cm: number;
  bias_magnitude_normalized: number;
  sigma_x_cm: number;
  sigma_y_cm: number;
  hv_ratio: number;
  hv_interpretation: string;
  fatigue_slope: number;
  fatigue_correlation: number;
  fatigue_interpretation: string;
  end_scores: EndScore[];
  first_arrow_avg: number;
  other_arrows_avg: number;
  first_arrow_penalty: number;
  first_arrow_interpretation: string;
}

export interface SessionScoreContext {
  session_id: string;
  date: string;
  round_type: string;
  distance_m: number;
  total_score: number;
  shot_count: number;
  avg_score: number;
  max_score: number;
  score_percentage: number;
  sigma_cm: number;
  cep_50: number;
  preset_arrow_count: number | null;
  round_complete: boolean;
}

export interface RoundPreset {
  name: string;
  arrow_count: number;
  ends: number;
  arrows_per_end: number;
  distance_m: number;
  face_size_cm: number;
  max_score: number;
  scoring_type: string;
  multi_distance: boolean;
}

export function useParkModel(shortRound: string, longRound: string, fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  params.set('short_round_type', shortRound);
  params.set('long_round_type', longRound);
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  return useQuery({
    queryKey: ['analytics', 'park-model', shortRound, longRound, fromDate, toDate],
    queryFn: () => apiFetch<ParkModelAnalysis>(`/api/analytics/park-model?${params.toString()}`),
    enabled: !!shortRound && !!longRound,
  });
}

export function useBiasAnalysis(roundTypes?: string[], fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (roundTypes?.length) params.set('round_type', roundTypes.join(','));
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  const qs = params.toString();
  return useQuery({
    queryKey: ['analytics', 'bias', roundTypes, fromDate, toDate],
    queryFn: () => apiFetch<BiasAnalysis>(`/api/analytics/bias-analysis${qs ? '?' + qs : ''}`),
  });
}

export function useScoreContext(roundTypes?: string[], fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (roundTypes?.length) params.set('round_type', roundTypes.join(','));
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  const qs = params.toString();
  return useQuery({
    queryKey: ['analytics', 'score-context', roundTypes, fromDate, toDate],
    queryFn: () => apiFetch<SessionScoreContext[]>(`/api/analytics/score-context${qs ? '?' + qs : ''}`),
  });
}

export function useRoundPresets() {
  return useQuery({
    queryKey: ['rounds', 'presets'],
    queryFn: () => apiFetch<RoundPreset[]>('/api/rounds/presets'),
  });
}

// ─── Advanced Precision Types ────────────────────────────

export interface AdvancedPrecision {
  total_shots: number;
  drms_cm: number;
  r95_cm: number;
  extreme_spread_cm: number;
  rayleigh_sigma: number;
  rayleigh_ci_lower: number;
  rayleigh_ci_upper: number;
  accuracy_pct: number;
  precision_pct: number;
  accuracy_precision_interpretation: string;
  ellipse_center_x: number;
  ellipse_center_y: number;
  ellipse_semi_major: number;
  ellipse_semi_minor: number;
  ellipse_angle_deg: number;
  ellipse_correlation: number;
  flier_count: number;
  flier_pct: number;
  clean_sigma: number;
  full_sigma: number;
  flier_interpretation: string;
}

export interface ConsistencyByRound {
  round_type: string;
  cv: number;
  mean: number;
  std: number;
  interpretation: string;
  session_count: number;
}

export interface TrendAnalysis {
  dates: string[];
  round_types: string[];
  scores: number[];
  sigmas: number[];
  score_ewma: number[];
  score_ucl: number[];
  score_lcl: number[];
  sigma_ewma: number[];
  sigma_ucl: number[];
  sigma_lcl: number[];
  consistency: ConsistencyByRound[];
}

export interface ShotPosition {
  position: number;
  avg_score: number;
  count: number;
}

export interface WithinEndAnalysis {
  positions: ShotPosition[];
  best_position: number;
  worst_position: number;
  interpretation: string;
  total_ends: number;
  arrows_per_end_mode: number;
}

export interface RingProbability {
  ring: number;
  probability: number;
}

export interface HitProbabilityAnalysis {
  round_type: string;
  total_shots: number;
  sigma_x_cm: number;
  sigma_y_cm: number;
  mpi_x_cm: number;
  mpi_y_cm: number;
  face_size_cm: number;
  ring_probs: RingProbability[];
  expected_score: number;
}

export interface EquipmentComparison {
  setup_a: string;
  setup_b: string;
  setup_a_sessions: number;
  setup_b_sessions: number;
  score_diff: number;
  score_p_value: number;
  score_cohens_d: number;
  sigma_diff: number;
  sigma_p_value: number;
  score_significant: boolean;
  sigma_significant: boolean;
  interpretation: string;
}

// ─── Advanced Analytics Hooks ────────────────────────────

export function useAdvancedPrecision(roundTypes?: string[], fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (roundTypes?.length) params.set('round_type', roundTypes.join(','));
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  const qs = params.toString();
  return useQuery({
    queryKey: ['analytics', 'advanced-precision', roundTypes, fromDate, toDate],
    queryFn: () => apiFetch<AdvancedPrecision>(`/api/analytics/advanced-precision${qs ? '?' + qs : ''}`),
  });
}

export function useTrends(roundTypes?: string[], fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (roundTypes?.length) params.set('round_type', roundTypes.join(','));
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  const qs = params.toString();
  return useQuery({
    queryKey: ['analytics', 'trends', roundTypes, fromDate, toDate],
    queryFn: () => apiFetch<TrendAnalysis>(`/api/analytics/trends${qs ? '?' + qs : ''}`),
  });
}

export function useWithinEnd(roundTypes?: string[], fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (roundTypes?.length) params.set('round_type', roundTypes.join(','));
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  const qs = params.toString();
  return useQuery({
    queryKey: ['analytics', 'within-end', roundTypes, fromDate, toDate],
    queryFn: () => apiFetch<WithinEndAnalysis>(`/api/analytics/within-end${qs ? '?' + qs : ''}`),
  });
}

export function useHitProbability(roundType: string, fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  params.set('round_type', roundType);
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  return useQuery({
    queryKey: ['analytics', 'hit-probability', roundType, fromDate, toDate],
    queryFn: () => apiFetch<HitProbabilityAnalysis>(`/api/analytics/hit-probability?${params.toString()}`),
    enabled: !!roundType,
  });
}

export function useEquipmentComparison(
  setupABowId?: string, setupAArrowId?: string,
  setupBBowId?: string, setupBArrowId?: string,
  roundType?: string, fromDate?: string, toDate?: string
) {
  const params = new URLSearchParams();
  if (setupABowId) params.set('setup_a_bow_id', setupABowId);
  if (setupAArrowId) params.set('setup_a_arrow_id', setupAArrowId);
  if (setupBBowId) params.set('setup_b_bow_id', setupBBowId);
  if (setupBArrowId) params.set('setup_b_arrow_id', setupBArrowId);
  if (roundType) params.set('round_type', roundType);
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  return useQuery({
    queryKey: ['analytics', 'equipment', setupABowId, setupAArrowId, setupBBowId, setupBArrowId, roundType, fromDate, toDate],
    queryFn: () => apiFetch<EquipmentComparison>(`/api/analytics/equipment-comparison?${params.toString()}`),
    enabled: !!(setupABowId || setupAArrowId) && !!(setupBBowId || setupBArrowId),
  });
}

export function useBows() {
  return useQuery({
    queryKey: ['bows'],
    queryFn: () => apiFetch<Array<{id: string; name: string}>>('/api/bows'),
  });
}

export function useArrows() {
  return useQuery({
    queryKey: ['arrows'],
    queryFn: () => apiFetch<Array<{id: string; make: string; model: string}>>('/api/arrows'),
  });
}

// Dashboard
export interface DashboardStats {
  total_sessions: number;
  total_arrows: number;
  days_since_last_practice: number | null;
  last_session_score: number | null;
  last_session_round: string | null;
  last_session_date: string | null;
  rolling_avg_score: number | null;
  personal_best_score: number | null;
  personal_best_round: string | null;
  personal_best_date: string | null;
  sparkline_dates: string[];
  sparkline_scores: number[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => apiFetch<DashboardStats>('/api/analytics/dashboard'),
  });
}

// Score Goal Simulator
export interface ScoreGoalSimulation {
  goal_total_score: number;
  goal_avg_arrow: number;
  required_sigma_cm: number;
  current_sigma_cm: number | null;
  current_avg_arrow: number | null;
  sigma_improvement_pct: number | null;
  distance_m: number;
  face_cm: number;
  feasible: boolean;
  interpretation: string;
}

export function useScoreGoal(goalScore: number, totalArrows: number, distanceM: number, faceCm: number, roundType?: string) {
  const params = new URLSearchParams();
  params.set('goal_total_score', goalScore.toString());
  params.set('total_arrows', totalArrows.toString());
  params.set('distance_m', distanceM.toString());
  params.set('face_cm', faceCm.toString());
  if (roundType) params.set('round_type', roundType);
  return useQuery({
    queryKey: ['analytics', 'score-goal', goalScore, totalArrows, distanceM, faceCm, roundType],
    queryFn: () => apiFetch<ScoreGoalSimulation>(`/api/analytics/score-goal?${params.toString()}`),
    enabled: goalScore > 0 && totalArrows > 0,
  });
}

// Arrow Performance
export interface ArrowPerformance {
  arrow_number: number;
  total_shots: number;
  avg_score: number;
  std_score: number;
  avg_radius: number;
  x_count: number;
  ten_count: number;
  miss_count: number;
  shots: Array<{ x: number; y: number; score: number; is_x: boolean }>;
  precision_score: number;
  precision_rank: number;
  tier: 'primary' | 'secondary' | 'reserve';
}

export interface ArrowTier {
  name: string;
  label: string;
  arrow_numbers: number[];
  avg_precision_score: number;
  avg_score: number;
  avg_radius: number;
}

export interface ArrowPerformanceSummary {
  arrows: ArrowPerformance[];
  best_arrow: number | null;
  worst_arrow: number | null;
  total_shots_with_number: number;
  total_shots_without_number: number;
  interpretation: string;
  face_cm: number;
  tiers: ArrowTier[];
  primary_set: number[];
  group_size: number;
}

export function useArrowPerformance(roundType?: string, fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (roundType) params.set('round_type', roundType);
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  return useQuery({
    queryKey: ['analytics', 'arrow-performance', roundType, fromDate, toDate],
    queryFn: () => apiFetch<ArrowPerformanceSummary>(`/api/analytics/arrow-performance?${params.toString()}`),
  });
}
