import { useMutation } from '@tanstack/react-query';
import {
  crawlService,
  type CrawlCalculateRequest,
  type CrawlCalculateResponse,
  type CrawlPredictRequest,
} from '../services/crawlService';

export type { CrawlCalculateRequest, CrawlCalculateResponse, CrawlPredictRequest };
export type { CrawlPoint } from '../services/crawlService';

export function useCalculateCrawl() {
  return useMutation({
    mutationFn: (data: CrawlCalculateRequest) =>
      Promise.resolve(crawlService.calculate(data)),
  });
}

export function usePredictCrawl() {
  return useMutation({
    mutationFn: (data: CrawlPredictRequest) =>
      Promise.resolve(crawlService.predict(data)),
  });
}
