/**
 * Typed API Client for CatalogAugment AI Platform
 * Handles REST communication with backend services at /api
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  message?: string;
  [key: string]: any;
}

export interface ProductImage {
  id: string;
  originalName: string;
  relativePath: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  maskPath?: string;
  foregroundPath?: string;
  segmentationStatus?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  jobs?: AugmentationJob[];
  vlmAnalyses?: VLMAnalysis[];
  _count?: {
    images?: number;
    jobs?: number;
  };
}

export interface AugmentationJob {
  id: string;
  productId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  workflowId: string;
  workflowVersion: string;
  progress: number;
  errorMessage?: string;
  createdAt: string;
  results?: AugmentationResult[];
}

export interface AugmentationResult {
  id: string;
  jobId?: string;
  productId: string;
  imagePath: string;
  thumbnailPath?: string;
  workflowId: string;
  workflowVersion: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number;
  isComposited: boolean;
  status: string;
  reviewDecision: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVIEW";
  reviewNotes?: string;
  createdAt: string;
  qualityAssessment?: QualityAssessment;
  vlmAnalyses?: VLMAnalysis[];
}

export interface QualitySignals {
  foregroundMSE?: number;
  foregroundPSNR?: number;
  laplacianVariance?: number;
  highlightClippingPercent?: number;
  shadowClippingPercent?: number;
  dynamicRangePercent?: number;
  perceptualSSIM?: number;
  [key: string]: any;
}

export interface QualityAssessment {
  id: string;
  augmentationResultId: string;
  productId: string;
  foregroundPreservationScore: number;
  perceptualSimilarityScore: number;
  sharpnessScore: number;
  exposureScore: number;
  vlmConsistencyScore?: number | null;
  compositeScore: number;
  decision: "PASS" | "REJECT" | "NEEDS_REVIEW";
  signals: QualitySignals;
  reviewNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  augmentationResult?: AugmentationResult;
}

export interface VLMAnalysis {
  id: string;
  productId: string;
  augmentationResultId?: string | null;
  taskType: "PRODUCT_ANALYSIS" | "IMAGE_CONSISTENCY" | "METADATA_ENRICHMENT";
  provider: string;
  modelName: string;
  normalizedData: {
    category?: string;
    subcategory?: string;
    dominantColors?: string[];
    accentColors?: string[];
    materials?: string[];
    styleTags?: string[];
    suggestedTags?: string[];
    description?: string;
    uncertaintyFlags?: string[];
    keyVisualFeatures?: string[];
    visualDiscrepancies?: string[];
    lightingConsistency?: string;
    styleConsistency?: string;
    consistencyScore?: number;
    [key: string]: any;
  };
  isConsistent?: boolean;
  confidence?: number;
  latencyMs?: number;
  createdAt: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  version: string;
  description: string;
  category?: string;
  defaultParams?: Record<string, any>;
  inputSchema?: any;
}

export interface Dataset {
  id: string;
  name: string;
  version: string;
  description?: string;
  splitConfig: {
    train: number;
    val: number;
    test: number;
    seed: number;
  };
  totalProducts: number;
  totalImages: number;
  status: string;
  createdAt: string;
  items?: DatasetItem[];
}

export interface DatasetItem {
  id: string;
  datasetId: string;
  productId: string;
  sku: string;
  split: "train" | "val" | "test";
  imagePath: string;
  isOriginal: boolean;
  metadata?: any;
}

export interface ExperimentMetric {
  experimentId: string;
  name: string;
  description: string;
  sampleCount: number;
  metrics: {
    recallAt1: number;
    recallAt5: number;
    recallAt10: number;
    precisionAt1: number;
    precisionAt5: number;
    meanAveragePrecision: number;
    meanReciprocalRank: number;
    ndcgAt5: number;
    averageLatencyMs: number;
  };
}

export interface EvaluationRun {
  id: string;
  name: string;
  encoderName: string;
  encoderDimension: number;
  status: string;
  metrics: {
    experiments: ExperimentMetric[];
    relativeGains?: {
      recallAt5Gain: number;
      mAPGain: number;
      mrrGain: number;
    };
    [key: string]: any;
  };
  durationMs?: number;
  createdAt: string;
}

export interface SearchQueryResult {
  rank: number;
  productId: string;
  sku: string;
  name: string;
  category?: string;
  score: number;
  matchType: string;
  imagePath?: string;
}

export interface SystemHealth {
  ok: boolean;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  services: {
    database: boolean;
    redis: boolean;
  };
}

export interface VlmProviderStatus {
  provider: string;
  available: boolean;
  models: string[];
  currentModel?: string;
  status?: string;
}

// Universal fetch wrapper
async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // Ensures Better-Auth cookie/session is sent
  });

  if (!res.ok) {
    let errMessage = `HTTP error ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      errMessage = errBody.error || errBody.message || errMessage;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return (await res.json()) as T;
}

export const api = {
  // Health
  getHealth: () => fetchJson<SystemHealth>("/api/health"),

  // Products
  getProducts: () => fetchJson<{ products: Product[] }>("/api/products"),
  getProduct: (id: string) => fetchJson<{ product: Product }>(`/api/products/${id}`),
  createProduct: (data: { name: string; sku?: string; category?: string; subcategory?: string; description?: string }) =>
    fetchJson<{ product: Product }>("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/products/${id}`, { method: "DELETE" }),
  uploadProductImage: async (productId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchJson<{ asset: ProductImage }>(`/api/products/${productId}/images`, {
      method: "POST",
      body: formData,
    });
  },

  // Augmentations
  getWorkflows: () => fetchJson<{ workflows: WorkflowItem[] }>("/api/augmentations/workflows"),
  submitJob: (data: {
    productId: string;
    workflowId: string;
    prompt?: string;
    negativePrompt?: string;
    seed?: number;
    batchSize?: number;
    compositeForeground?: boolean;
    cfg?: number;
    steps?: number;
    denoise?: number;
  }) =>
    fetchJson<{ job: AugmentationJob }>("/api/augmentations/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  getJob: (jobId: string) => fetchJson<{ job: AugmentationJob }>(`/api/augmentations/jobs/${jobId}`),
  cancelJob: (jobId: string) =>
    fetchJson<{ success: boolean }>(`/api/augmentations/jobs/${jobId}/cancel`, { method: "POST" }),
  getCompare: (productId: string) =>
    fetchJson<{
      productId: string;
      originalImage: { path: string; maskPath?: string };
      variants: AugmentationResult[];
    }>(`/api/augmentations/compare/${productId}`),
  reviewVariant: (resultId: string, decision: "APPROVE" | "REJECT" | "NEEDS_REVIEW", notes?: string) =>
    fetchJson<{ result: AugmentationResult }>(`/api/augmentations/results/${resultId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes }),
    }),

  // VLM
  getVlmProviders: () => fetchJson<{ providers: VlmProviderStatus[] }>("/api/vlm/providers"),
  analyzeProduct: (productId: string) =>
    fetchJson<{ analysis: VLMAnalysis }>(`/api/vlm/analyze-product/${productId}`, { method: "POST" }),
  compareVariant: (resultId: string) =>
    fetchJson<{ analysis: VLMAnalysis }>(`/api/vlm/compare-variant/${resultId}`, { method: "POST" }),
  getProductAnalyses: (productId: string) =>
    fetchJson<{ analyses: VLMAnalysis[] }>(`/api/vlm/analyses/product/${productId}`),
  getResultAnalyses: (resultId: string) =>
    fetchJson<{ analyses: VLMAnalysis[] }>(`/api/vlm/analyses/result/${resultId}`),

  // Quality Control
  getQualityQueue: () => fetchJson<{ queue: QualityAssessment[] }>("/api/quality/queue"),
  getAssessment: (resultId: string) =>
    fetchJson<{ assessment: QualityAssessment }>(`/api/quality/assessment/${resultId}`),
  assessResult: (resultId: string) =>
    fetchJson<{ assessment: QualityAssessment }>(`/api/quality/assess/${resultId}`, { method: "POST" }),
  submitQualityReview: (
    resultId: string,
    decision: "PASS" | "FAIL" | "NEEDS_REVIEW",
    feedbackNotes?: string
  ) =>
    fetchJson<{ assessment: QualityAssessment }>(`/api/quality/review/${resultId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, feedbackNotes }),
    }),

  // Datasets
  getDatasets: () => fetchJson<{ datasets: Dataset[] }>("/api/datasets"),
  getDataset: (id: string) => fetchJson<{ dataset: Dataset }>(`/api/datasets/${id}`),
  createDataset: (data: {
    name: string;
    version?: string;
    description?: string;
    trainRatio?: number;
    valRatio?: number;
    testRatio?: number;
    seed?: number;
    includedProductIds?: string[];
  }) =>
    fetchJson<{ dataset: Dataset }>("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteDataset: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/datasets/${id}`, { method: "DELETE" }),

  // Evaluations / Visual Search
  runBenchmark: (config?: { topK?: number; seed?: number; sampleCount?: number }) =>
    fetchJson<{ run: EvaluationRun }>("/api/evaluations/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config || {}),
    }),
  getBenchmarkRuns: () => fetchJson<{ runs: EvaluationRun[] }>("/api/evaluations"),
  getBenchmarkRun: (id: string) => fetchJson<{ run: EvaluationRun }>(`/api/evaluations/${id}`),
  searchCatalog: async (imageFile: File, topK: number = 5) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("topK", String(topK));
    return fetchJson<{
      queryMetrics: { latencyMs: number; topK: number };
      results: SearchQueryResult[];
    }>("/api/evaluations/search", {
      method: "POST",
      body: formData,
    });
  },
};
