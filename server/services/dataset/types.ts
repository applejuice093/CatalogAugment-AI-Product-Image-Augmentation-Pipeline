export type DatasetSplit = "train" | "val" | "test";

export interface DatasetSplitConfig {
  trainRatio: number; // e.g. 0.70
  valRatio: number;   // e.g. 0.15
  testRatio: number;  // e.g. 0.15
  randomSeed: number; // default 42 for deterministic reproducibility
  includeOriginals: boolean; // default true
  minQualityScore?: number;
  onlyApproved?: boolean;
}

export interface DatasetItemProvenance {
  productId: string;
  sku: string;
  productName: string;
  isOriginal: boolean;
  originalAssetId?: string;
  augmentationResultId?: string;
  workflowId?: string;
  workflowVersion?: string;
  prompt?: string;
  seed?: string;
  generationParams?: Record<string, unknown>;
  vlmProvider?: string;
  qualityScore?: number;
  qualityDecision?: string;
}

export interface DatasetItemRecord {
  id: string;
  productId: string;
  sku: string;
  split: DatasetSplit;
  imagePath: string;
  archivePath: string;
  isOriginal: boolean;
  metadata: DatasetItemProvenance;
}

export interface DatasetManifest {
  datasetId: string;
  name: string;
  version: string;
  schemaVersion: string;
  exportTimestamp: string;
  splitConfig: DatasetSplitConfig;
  totalProducts: number;
  totalImages: number;
  splitBreakdown: {
    train: { products: number; images: number };
    val: { products: number; images: number };
    test: { products: number; images: number };
  };
  records: DatasetItemRecord[];
}
