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
