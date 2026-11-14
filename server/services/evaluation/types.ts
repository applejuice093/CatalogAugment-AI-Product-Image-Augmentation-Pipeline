export interface IImageEncoder {
  readonly name: string;
  readonly dimension: number;
  generateEmbedding(imageBuffer: Buffer): Promise<number[]>;
}

export type ExperimentName =
  | "EXPERIMENT_A"
  | "EXPERIMENT_B"
  | "EXPERIMENT_C"
  | "EXPERIMENT_D";

export interface IndexedCatalogItem {
  id: string;
  productId: string;
  sku: string;
  imagePath: string;
  isAugmented: boolean;
  augmentationType: "original" | "conventional" | "generative";
  embedding: number[];
}

export interface SearchResult {
  productId: string;
  sku: string;
  itemId: string;
  imagePath: string;
  similarityScore: number;
  isAugmented: boolean;
  augmentationType: string;
}

export interface EvaluationMetrics {
  recallAt1: number;
  recallAt5: number;
  recallAt10: number;
  precisionAt1: number;
  precisionAt5: number;
  mAP: number;
  mrr: number;
  ndcgAt5: number;
  avgLatencyMs: number;
  indexedCatalogSize: number;
  queryCount: number;
}

export interface ExperimentResult {
  experiment: ExperimentName;
  name: string;
  description: string;
  metrics: EvaluationMetrics;
}

export interface EvaluationRunReport {
  id: string;
  name: string;
  datasetId?: string;
  encoderName: string;
  encoderDimension: number;
  experiments: Record<ExperimentName, ExperimentResult>;
  relativeGains: {
    generativeOverBaseline: {
      recallAt5Pct: number;
      mrrPct: number;
    };
    combinedOverBaseline: {
      recallAt5Pct: number;
      mrrPct: number;
    };
  };
  durationMs: number;
  timestamp: string;
}
