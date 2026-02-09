import { useMutation } from '@tanstack/react-query';
import { apiFetch } from './client';

// Virtual Coach
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

export interface VirtualCoachResult {
  safety: string[];
  setup_score: {
    score: number;
    gpp: number;
    feedback: string[];
  };
  performance_metrics: {
    predicted_score: number;
    actual_score: number;
    points_lost: number;
    percent_loss: number;
  };
  coach_recommendations: string[];
}

export function useVirtualCoach() {
  return useMutation({
    mutationFn: (data: VirtualCoachRequest) =>
      apiFetch<VirtualCoachResult>('/api/analysis/virtual-coach', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

// Score Prediction
export interface PredictScoreRequest {
  known_score: number;
  known_distance_m: number;
  known_face_cm: number;
  target_distance_m: number;
  target_face_cm: number;
}

export function usePredictScore() {
  return useMutation({
    mutationFn: (data: PredictScoreRequest) =>
      apiFetch<{ predicted_score: number; predicted_sigma: number }>('/api/analysis/predict-score', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
