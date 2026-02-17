/**
 * Crawl service — mirrors api/routers/crawls.py.
 * Pure computation with polynomial regression, no database access.
 */

import {
  calculateCrawlRegression,
  predictCrawl,
  generateCrawlChart,
  findPointOnDistance,
} from "../domain/crawls";

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

function validateCrawlLists(distances: number[], crawls: number[]): void {
  if (distances.length < 2) {
    throw new Error("At least 2 data points are required");
  }
  if (distances.length !== crawls.length) {
    throw new Error("Distances and crawls must have the same length");
  }
}

export const crawlService = {
  calculate(request: CrawlCalculateRequest): CrawlCalculateResponse {
    validateCrawlLists(request.known_distances, request.known_crawls);

    const model = calculateCrawlRegression(request.known_distances, request.known_crawls);
    const chart = generateCrawlChart(
      model,
      request.min_dist ?? Math.min(...request.known_distances) - 2,
      request.max_dist ?? Math.max(...request.known_distances) + 5,
      request.step ?? 0.5
    );
    const pod = findPointOnDistance(model);

    return {
      chart: chart.map(([distance, crawl]) => ({ distance, crawl_mm: crawl })),
      coefficients: model,
      point_on_distance: pod,
    };
  },

  predict(request: CrawlPredictRequest): { distance: number; crawl_mm: number } {
    validateCrawlLists(request.known_distances, request.known_crawls);

    const model = calculateCrawlRegression(request.known_distances, request.known_crawls);
    const crawl = predictCrawl(model, request.target_distance);

    return {
      distance: request.target_distance,
      crawl_mm: crawl,
    };
  },
};
