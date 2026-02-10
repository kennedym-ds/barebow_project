import { useMutation } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface CrawlCalculateRequest {
  known_distances: number[];
  known_crawls: number[];
  min_dist?: number;
  max_dist?: number;
  step?: number;
}

export interface CrawlPoint {
  distance: number;
  crawl_mm: number;
}

export interface CrawlCalculateResponse {
  chart: CrawlPoint[];
  coefficients: number[];
  point_on_distance: number | null;
}

export interface CrawlPredictRequest {
  known_distances: number[];
  known_crawls: number[];
  target_distance: number;
}

export function useCalculateCrawl() {
  return useMutation({
    mutationFn: (data: CrawlCalculateRequest) =>
      apiFetch<CrawlCalculateResponse>('/api/crawls/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function usePredictCrawl() {
  return useMutation({
    mutationFn: (data: CrawlPredictRequest) =>
      apiFetch<{ distance: number; crawl_mm: number }>('/api/crawls/predict', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
