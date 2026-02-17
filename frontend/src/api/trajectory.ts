import { useMutation } from '@tanstack/react-query';
import type { TrajectoryRequest, DriftRequest } from '../types/models';
import { trajectoryService } from '../services/trajectoryService';

export function usePredictTrajectory() {
  return useMutation({
    mutationFn: (request: TrajectoryRequest) =>
      Promise.resolve(trajectoryService.predict(request)),
  });
}

export function useEstimateDrift() {
  return useMutation({
    mutationFn: (request: DriftRequest) =>
      Promise.resolve(trajectoryService.estimateDrift(request)),
  });
}
