import { useMutation } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { TrajectoryRequest, TrajectoryResponse, DriftRequest, DriftResponse } from '../types/models';

export function usePredictTrajectory() {
  return useMutation({
    mutationFn: (request: TrajectoryRequest) =>
      apiFetch<TrajectoryResponse>('/api/trajectory/predict', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  });
}

export function useEstimateDrift() {
  return useMutation({
    mutationFn: (request: DriftRequest) =>
      apiFetch<DriftResponse>('/api/trajectory/drift', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  });
}
