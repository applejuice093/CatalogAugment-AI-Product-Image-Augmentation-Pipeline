import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config/unifiedConfig.ts";
import { AssetRepository } from "../../repositories/AssetRepository.ts";
import { AugmentationResultRepository } from "../../repositories/AugmentationResultRepository.ts";
import { ProductRepository } from "../../repositories/ProductRepository.ts";
import { QualityAssessmentRepository } from "../../repositories/QualityAssessmentRepository.ts";
import { VLMAnalysisRepository } from "../../repositories/VLMAnalysisRepository.ts";
import { defaultVLMService, type VLMService } from "../vlm/vlmService.ts";
import { ArtifactAnalyzer } from "./analyzers/artifactAnalyzer.ts";
import { ForegroundPreservationAnalyzer } from "./analyzers/foregroundPreservationAnalyzer.ts";
import { PerceptualSimilarityAnalyzer } from "./analyzers/perceptualSimilarityAnalyzer.ts";
import {
  defaultQualityScoringEngine,
  QualityScoringEngine,
} from "./qualityScoringEngine.ts";
import type {
  CalibrationReport,
  CalibrationSample,
  QualityAssessmentResult,
  QualityDecision,
  QualitySignals,
  QualityVLMSignal,
} from "./types.ts";

export class QualityAssessmentService {
  private resultRepo: AugmentationResultRepository;
  private productRepo: ProductRepository;
  private assetRepo: AssetRepository;
  private qualityRepo: QualityAssessmentRepository;
  private vlmRepo: VLMAnalysisRepository;
  private vlmService: VLMService;
  private fgAnalyzer: ForegroundPreservationAnalyzer;
  private similarityAnalyzer: PerceptualSimilarityAnalyzer;
  private artifactAnalyzer: ArtifactAnalyzer;
  private scoringEngine: QualityScoringEngine;

  constructor(
    resultRepo = new AugmentationResultRepository(),
    productRepo = new ProductRepository(),
    assetRepo = new AssetRepository(),
    qualityRepo = new QualityAssessmentRepository(),
    vlmRepo = new VLMAnalysisRepository(),
    vlmService = defaultVLMService,
    scoringEngine = defaultQualityScoringEngine
  ) {
    this.resultRepo = resultRepo;
    this.productRepo = productRepo;
    this.assetRepo = assetRepo;
    this.qualityRepo = qualityRepo;
    this.vlmRepo = vlmRepo;
    this.vlmService = vlmService;
    this.scoringEngine = scoringEngine;

    this.fgAnalyzer = new ForegroundPreservationAnalyzer();
    this.similarityAnalyzer = new PerceptualSimilarityAnalyzer();
    this.artifactAnalyzer = new ArtifactAnalyzer();
  }

  /**
   * Run automated multi-modal quality assessment on a generated variant
   */
  async assessResult(
    resultId: string,
    userId: string,
    includeVLM = true
  ): Promise<QualityAssessmentResult> {
    const augResult = await this.resultRepo.findById(resultId);
    if (!augResult) {
      throw new Error(`Augmentation result not found: ${resultId}`);
    }

    const product = await this.productRepo.findByIdAndUserId(augResult.productId, userId);
    if (!product) {
      throw new Error("Product not found or access denied.");
    }

    // Resolve original asset and mask
    let originalAsset = augResult.originalAssetId
      ? await this.assetRepo.findById(augResult.originalAssetId)
      : null;

    if (!originalAsset) {
      const images = (product as unknown as { images?: Array<{ id: string }> }).images || [];
      if (images.length > 0) {
        originalAsset = await this.assetRepo.findById(images[0].id);
      }
    }

    if (!originalAsset) {
      throw new Error("Original product asset could not be resolved for quality comparison.");
    }

    const origFullPath = path.resolve(config.storage.uploadRoot, originalAsset.relativePath);
    const augFullPath = path.resolve(config.storage.uploadRoot, augResult.imagePath);

    const originalBuffer = await fs.readFile(origFullPath);
    const augmentedBuffer = await fs.readFile(augFullPath);

    let maskBuffer: Buffer | undefined;
    if (originalAsset.maskPath) {
      try {
        const maskFullPath = path.resolve(config.storage.uploadRoot, originalAsset.maskPath);
        maskBuffer = await fs.readFile(maskFullPath);
      } catch {
        // Fall back gracefully to alpha mask
      }
    }

    // 1. Foreground preservation analysis
    const foregroundSignal = await this.fgAnalyzer.analyze(
      originalBuffer,
      augmentedBuffer,
      maskBuffer
    );

    // 2. Perceptual similarity analysis
    const similaritySignal = await this.similarityAnalyzer.analyze(
      originalBuffer,
      augmentedBuffer
    );

    // 3. Artifact, sharpness, and exposure analysis
    const artifactSignal = await this.artifactAnalyzer.analyze(augmentedBuffer);

    // 4. VLM Consistency Assessment Integration
    let vlmSignal: QualityVLMSignal = { available: false };

    if (includeVLM) {
      try {
        const existingVlm = await this.vlmRepo.findByResultId(resultId);
        if (existingVlm && existingVlm.length > 0) {
          const latest = existingVlm[0];
          const normData = latest.normalizedData as Record<string, unknown>;
          vlmSignal = {
            available: true,
            identityScore:
              typeof normData.identityPreservationScore === "number"
                ? normData.identityPreservationScore
                : undefined,
            recommendation:
              typeof normData.reviewRecommendation === "string"
                ? normData.reviewRecommendation
                : undefined,
            notes:
              typeof normData.assessmentNotes === "string"
                ? normData.assessmentNotes
                : undefined,
          };
        } else {
          // Trigger dynamic Task B consistency comparison
          const vlmExecution = await this.vlmService.compareAugmentationVariant(
            resultId,
            userId
          );
          vlmSignal = {
            available: true,
            identityScore: vlmExecution.data.identityPreservationScore,
            recommendation: vlmExecution.data.reviewRecommendation,
            notes: vlmExecution.data.assessmentNotes,
          };
        }
      } catch (vlmErr) {
        console.warn("[QualityAssessmentService] VLM check skipped or failed:", vlmErr);
      }
    }

    // Combine all signals
    const signals: QualitySignals = {
      foreground: foregroundSignal,
      similarity: similaritySignal,
      sharpness: artifactSignal.sharpness,
      exposure: artifactSignal.exposure,
      artifacts: artifactSignal.detectedArtifacts,
      vlm: vlmSignal,
    };

    // Evaluate final composite decision
    const assessmentResult = this.scoringEngine.evaluate(signals);

    // Persist assessment to database
    const existingAssessment = await this.qualityRepo.findByResultId(resultId);
    if (!existingAssessment) {
      await this.qualityRepo.create({
        augmentationResultId: resultId,
        productId: product.id,
        foregroundPreservationScore: assessmentResult.foregroundPreservationScore,
        perceptualSimilarityScore: assessmentResult.perceptualSimilarityScore,
        sharpnessScore: assessmentResult.sharpnessScore,
        exposureScore: assessmentResult.exposureScore,
        vlmConsistencyScore: assessmentResult.vlmConsistencyScore,
        compositeScore: assessmentResult.compositeScore,
        decision: assessmentResult.decision,
        signals: assessmentResult.signals as unknown as Record<string, unknown>,
      });
    }

    // Update AugmentationResult reviewDecision status
    await this.resultRepo.updateReview(resultId, {
      reviewDecision: assessmentResult.decision === "PASS" ? "APPROVED" : assessmentResult.decision,
    });

    return assessmentResult;
  }

  /**
   * Retrieve existing assessment by result ID
   */
  async getAssessment(resultId: string, userId: string) {
    const augResult = await this.resultRepo.findById(resultId);
    if (!augResult) {
      throw new Error(`Augmentation result not found: ${resultId}`);
    }

    const product = await this.productRepo.findByIdAndUserId(augResult.productId, userId);
    if (!product) {
      throw new Error("Product not found or access denied.");
    }

    return this.qualityRepo.findByResultId(resultId);
  }

  /**
   * Submit manual human review decision and audit trail
   */
  async submitManualReview(
    resultId: string,
    userId: string,
    review: {
      decision: QualityDecision;
      reviewNotes?: string;
      rejectionReason?: string;
    }
  ) {
    const augResult = await this.resultRepo.findById(resultId);
    if (!augResult) {
      throw new Error(`Augmentation result not found: ${resultId}`);
    }

    const product = await this.productRepo.findByIdAndUserId(augResult.productId, userId);
    if (!product) {
      throw new Error("Product not found or access denied.");
    }

    let assessment = await this.qualityRepo.findByResultId(resultId);
    if (assessment) {
      assessment = await this.qualityRepo.updateReview(assessment.id, {
        decision: review.decision,
        reviewerId: userId,
        reviewNotes: review.reviewNotes,
        rejectionReason: review.rejectionReason,
      });
    }

    // Update AugmentationResult
    await this.resultRepo.updateReview(resultId, {
      reviewDecision: review.decision === "PASS" ? "APPROVED" : review.decision,
      reviewNotes: review.reviewNotes,
      reviewedBy: userId,
    });

    return {
      success: true,
      resultId,
      decision: review.decision,
      reviewedAt: new Date(),
    };
  }

  /**
   * List queue of variants pending human inspection
   */
  async getReviewQueue(limit = 50, offset = 0) {
    return this.qualityRepo.findReviewQueue(limit, offset);
  }

  /**
   * Run calibration against sample pairs to evaluate threshold performance
   */
  async calibrate(samples: CalibrationSample[]): Promise<CalibrationReport> {
    const evaluated: Array<{ calculatedScore: number; groundTruth: QualityDecision }> = [];

    for (const sample of samples) {
      const fg = await this.fgAnalyzer.analyze(
        sample.originalBuffer,
        sample.augmentedBuffer,
        sample.maskBuffer
      );
      const sim = await this.similarityAnalyzer.analyze(
        sample.originalBuffer,
        sample.augmentedBuffer
      );
      const art = await this.artifactAnalyzer.analyze(sample.augmentedBuffer);

      const signals: QualitySignals = {
        foreground: fg,
        similarity: sim,
        sharpness: art.sharpness,
        exposure: art.exposure,
        artifacts: art.detectedArtifacts,
        vlm: { available: false },
      };

      const result = this.scoringEngine.evaluate(signals);
      evaluated.push({
        calculatedScore: result.compositeScore,
        groundTruth: sample.groundTruthLabel,
      });
    }

    return this.scoringEngine.calibrate(evaluated);
  }
}

export const defaultQualityAssessmentService = new QualityAssessmentService();
