import type { EvaluationMetrics, SearchResult } from "./types.ts";

export interface QueryEvaluation {
  targetProductId: string;
  results: SearchResult[];
  latencyMs: number;
}

export class MetricsCalculator {
  /**
   * Computes standard Information Retrieval metrics across evaluation query trials
   */
  calculateMetrics(
    evaluations: QueryEvaluation[],
    indexedCatalogSize: number
  ): EvaluationMetrics {
    const totalQueries = evaluations.length;
    if (totalQueries === 0) {
      return {
        recallAt1: 0,
        recallAt5: 0,
        recallAt10: 0,
        precisionAt1: 0,
        precisionAt5: 0,
        mAP: 0,
        mrr: 0,
        ndcgAt5: 0,
        avgLatencyMs: 0,
        indexedCatalogSize,
        queryCount: 0,
      };
    }

    let recall1Count = 0;
    let recall5Count = 0;
    let recall10Count = 0;
    let precision1Sum = 0;
    let precision5Sum = 0;
    let reciprocalRankSum = 0;
    let apSum = 0;
    let ndcg5Sum = 0;
    let latencySum = 0;

    for (const q of evaluations) {
      latencySum += q.latencyMs;
      const targetId = q.targetProductId;
      const top10 = q.results.slice(0, 10);
      const top5 = top10.slice(0, 5);
      const top1 = top10.slice(0, 1);

      // Recall@K
      const hit1 = top1.some((r) => r.productId === targetId);
      const hit5 = top5.some((r) => r.productId === targetId);
      const hit10 = top10.some((r) => r.productId === targetId);

      if (hit1) recall1Count++;
      if (hit5) recall5Count++;
      if (hit10) recall10Count++;

      // Precision@K
      const p1Hits = top1.filter((r) => r.productId === targetId).length;
      const p5Hits = top5.filter((r) => r.productId === targetId).length;
      precision1Sum += p1Hits / 1;
      precision5Sum += p5Hits / 5;

      // Reciprocal Rank (MRR)
      let firstRank = 0;
      for (let i = 0; i < top10.length; i++) {
        if (top10[i].productId === targetId) {
          firstRank = i + 1;
          break;
        }
      }
      if (firstRank > 0) {
        reciprocalRankSum += 1 / firstRank;
      }

      // Average Precision (AP)
      let runningHits = 0;
      let precisionsAtHitsSum = 0;
      for (let i = 0; i < top10.length; i++) {
        if (top10[i].productId === targetId) {
          runningHits++;
          precisionsAtHitsSum += runningHits / (i + 1);
        }
      }
      apSum += runningHits > 0 ? precisionsAtHitsSum / runningHits : 0;

      // NDCG@5 (binary relevance)
      let dcg5 = 0;
      for (let i = 0; i < top5.length; i++) {
        if (top5[i].productId === targetId) {
          dcg5 += 1 / Math.log2(i + 2);
        }
      }
      // Ideal DCG has the hit at rank 1
      const idcg5 = 1 / Math.log2(2);
      ndcg5Sum += dcg5 / idcg5;
    }

    return {
      recallAt1: Number((recall1Count / totalQueries).toFixed(4)),
      recallAt5: Number((recall5Count / totalQueries).toFixed(4)),
      recallAt10: Number((recall10Count / totalQueries).toFixed(4)),
      precisionAt1: Number((precision1Sum / totalQueries).toFixed(4)),
      precisionAt5: Number((precision5Sum / totalQueries).toFixed(4)),
      mAP: Number((apSum / totalQueries).toFixed(4)),
      mrr: Number((reciprocalRankSum / totalQueries).toFixed(4)),
      ndcgAt5: Number((ndcg5Sum / totalQueries).toFixed(4)),
      avgLatencyMs: Number((latencySum / totalQueries).toFixed(2)),
      indexedCatalogSize,
      queryCount: totalQueries,
    };
  }
}

export const defaultMetricsCalculator = new MetricsCalculator();
