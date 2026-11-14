export type QualityDecision = "PASS" | "REJECT" | "NEEDS_REVIEW";

export interface QualityForegroundSignal {
  psnr: number;
  mse: number;
  maskedPixelCount: number;
  preservationScore: number; // 0 to 100
}

export interface QualitySimilaritySignal {
  perceptualDistance: number;
  similarityScore: number; // 0 to 100
}

export interface QualitySharpnessSignal {
  laplacianVariance: number;
  sharpnessScore: number; // 0 to 100
  isBlurred: boolean;
}

export interface QualityExposureSignal {
  underExposedRatio: number;
  overExposedRatio: number;
  exposureScore: number; // 0 to 100
  hasClipping: boolean;
}

export interface QualityVLMSignal {
  available: boolean;
  identityScore?: number;
  recommendation?: string;
  notes?: string;
}

export interface QualitySignals {
  foreground: QualityForegroundSignal;
  similarity: QualitySimilaritySignal;
  sharpness: QualitySharpnessSignal;
  exposure: QualityExposureSignal;
  artifacts: string[];
  vlm: QualityVLMSignal;
}

export interface QualityAssessmentResult {
  foregroundPreservationScore: number;
  perceptualSimilarityScore: number;
  sharpnessScore: number;
  exposureScore: number;
  vlmConsistencyScore?: number;
  compositeScore: number;
  decision: QualityDecision;
  signals: QualitySignals;
}

export interface CalibrationSample {
  originalBuffer: Buffer;
  augmentedBuffer: Buffer;
  maskBuffer?: Buffer;
  groundTruthLabel: QualityDecision;
}

export interface CalibrationReport {
  totalEvaluated: number;
  correctPredictions: number;
  accuracy: number;
  breakdown: {
    passCount: number;
    rejectCount: number;
    needsReviewCount: number;
  };
  recommendedThresholds: {
    passThreshold: number;
    rejectThreshold: number;
    criticalFgThreshold: number;
  };
}
