export type VLMAnalysisTask =
  | "PRODUCT_ANALYSIS"
  | "IMAGE_CONSISTENCY"
  | "METADATA_ENRICHMENT";

export interface ProductAnalysisOutput {
  category: string;
  subcategory: string;
  dominantColors: string[];
  identifiableMaterials: string[];
  distinctiveAttributes: string[];
  description: string;
  searchTags: string[];
  uncertainAttributes: string[];
  confidence: number;
}

export interface ImageConsistencyOutput {
  isSameProduct: boolean;
  identityPreservationScore: number; // 0 to 100
  colorPreservation: string;
  shapePreservation: string;
  designPreservation: string;
  visibleArtifacts: string[];
  reviewRecommendation: "APPROVED" | "REJECTED" | "NEEDS_REVIEW";
  assessmentNotes: string;
}

export interface VLMExecutionResult<T = unknown> {
  taskType: VLMAnalysisTask;
  provider: string;
  modelName: string;
  promptVersion: string;
  rawOutput?: string;
  data: T;
  latencyMs: number;
  isConsistent?: boolean;
  confidence?: number;
}

export interface IVLMProvider {
  readonly name: string;
  readonly modelName: string;
  checkHealth(): Promise<boolean>;
  analyzeProduct(
    imageBuffer: Buffer,
    mimeType?: string
  ): Promise<ProductAnalysisOutput>;
  compareConsistency(
    originalBuffer: Buffer,
    augmentedBuffer: Buffer,
    mimeType?: string
  ): Promise<ImageConsistencyOutput>;
}
