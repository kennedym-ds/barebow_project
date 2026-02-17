import { useMutation } from '@tanstack/react-query';
import {
  analysisService,
  type VirtualCoachRequest,
  type PredictScoreRequest,
} from '../services/analysisService';
import type { CoachAnalysis } from '../domain/analysis';

export type { VirtualCoachRequest, PredictScoreRequest };
export type VirtualCoachResult = CoachAnalysis;

export function useVirtualCoach() {
  return useMutation({
    mutationFn: (data: VirtualCoachRequest) =>
      Promise.resolve(analysisService.virtualCoach(data)),
  });
}

export function usePredictScore() {
  return useMutation({
    mutationFn: (data: PredictScoreRequest) =>
      Promise.resolve(analysisService.predictScore(data)),
  });
}
