import { describe, expect, it } from "vitest";
import {
  MetricsCalculator,
  type QueryEvaluation,
} from "../server/services/evaluation/metricsCalculator.ts";

describe("MetricsCalculator Unit Tests", () => {
  const calculator = new MetricsCalculator();

  it("calculates 1.0 for perfect top-1 retrieval performance", () => {
    const perfectTrial: QueryEvaluation[] = [
      {
        targetProductId: "prod-1",
        latencyMs: 10,
        results: [
          {
            productId: "prod-1",
            sku: "SKU-01",
            itemId: "it-1",
            imagePath: "1.png",
            similarityScore: 0.98,
            isAugmented: false,
            augmentationType: "original",
          },
        ],
      },
      {
        targetProductId: "prod-2",
        latencyMs: 12,
        results: [
          {
            productId: "prod-2",
            sku: "SKU-02",
            itemId: "it-2",
            imagePath: "2.png",
            similarityScore: 0.95,
            isAugmented: false,
            augmentationType: "original",
          },
        ],
      },
    ];

    const metrics = calculator.calculateMetrics(perfectTrial, 10);

    expect(metrics.recallAt1).toBe(1.0);
    expect(metrics.recallAt5).toBe(1.0);
    expect(metrics.mrr).toBe(1.0);
    expect(metrics.ndcgAt5).toBe(1.0);
    expect(metrics.avgLatencyMs).toBe(11);
    expect(metrics.queryCount).toBe(2);
  });

  it("correctly penalizes lower ranked hits (MRR and NDCG)", () => {
    // Target product is hit at rank 2
    const rank2Trial: QueryEvaluation[] = [
      {
        targetProductId: "prod-1",
        latencyMs: 15,
        results: [
          {
            productId: "other-prod",
            sku: "OTHER",
            itemId: "it-other",
            imagePath: "other.png",
            similarityScore: 0.99,
            isAugmented: false,
            augmentationType: "original",
          },
          {
            productId: "prod-1",
            sku: "SKU-01",
            itemId: "it-1",
            imagePath: "1.png",
            similarityScore: 0.92,
            isAugmented: false,
            augmentationType: "original",
          },
        ],
      },
    ];

    const metrics = calculator.calculateMetrics(rank2Trial, 10);

    expect(metrics.recallAt1).toBe(0.0);
    expect(metrics.recallAt5).toBe(1.0);
    expect(metrics.mrr).toBe(0.5); // 1 / 2 = 0.5
    expect(metrics.ndcgAt5).toBeLessThan(1.0);
  });
});
