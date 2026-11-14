import { config } from "../../config/unifiedConfig.ts";
import type {
  CalibrationReport,
  QualityAssessmentResult,
  QualityDecision,
  QualitySignals,
} from "./types.ts";

export interface ScoringConfig {
  passThreshold: number;
  rejectThreshold: number;
  criticalFgThreshold: number;
  weights: {
    foreground: number;
    similarity: number;
    sharpness: number;
    exposure: number;
    vlm: number;
  };
}

export class QualityScoringEngine {
  private scoringConfig: ScoringConfig;

  constructor(customConfig?: Partial<ScoringConfig>) {
    this.scoringConfig = {
      passThreshold: customConfig?.passThreshold ?? config.qc.passThreshold,
      rejectThreshold: customConfig?.rejectThreshold ?? config.qc.rejectThreshold,
      criticalFgThreshold:
        customConfig?.criticalFgThreshold ?? config.qc.criticalFgThreshold,
      weights: {
        foreground: customConfig?.weights?.foreground ?? config.qc.weights.foreground,
        similarity: customConfig?.weights?.similarity ?? config.qc.weights.similarity,
        sharpness: customConfig?.weights?.sharpness ?? config.qc.weights.sharpness,
        exposure: customConfig?.weights?.exposure ?? config.qc.weights.exposure,
        vlm: customConfig?.weights?.vlm ?? config.qc.weights.vlm,
      },
    };
  }

  /**
   * Computes the composite quality score and determines the pass/reject/needs_review decision
   */
  evaluate(signals: QualitySignals): QualityAssessmentResult {
    const { foreground, similarity, sharpness, exposure, vlm, artifacts } = signals;

    let compositeScore: number;

    if (vlm.available && typeof vlm.identityScore === "number") {
      // Full multi-modal scoring with VLM Task B integration
      const w = this.scoringConfig.weights;
      compositeScore =
        w.foreground * foreground.preservationScore +
        w.similarity * similarity.similarityScore +
        w.sharpness * sharpness.sharpnessScore +
        w.exposure * exposure.exposureScore +
        w.vlm * vlm.identityScore;
    } else {
      // Heuristic scoring (renormalize weights without VLM)
      const w = this.scoringConfig.weights;
      const heuristicWeightSum =
        w.foreground + w.similarity + w.sharpness + w.exposure;
      compositeScore =
        (w.foreground * foreground.preservationScore +
          w.similarity * similarity.similarityScore +
          w.sharpness * sharpness.sharpnessScore +
          w.exposure * exposure.exposureScore) /
        heuristicWeightSum;
    }

    compositeScore = Math.max(0, Math.min(100, Math.round(compositeScore)));

    let decision: QualityDecision;

    // Gate 1: Strict product-region preservation check
    if (foreground.preservationScore < this.scoringConfig.criticalFgThreshold) {
      decision = "REJECT";
      if (!artifacts.some((a) => a.includes("Foreground identity"))) {
        artifacts.unshift(
          `Foreground identity preservation (${foreground.preservationScore}%) is below critical threshold (${this.scoringConfig.criticalFgThreshold}%).`
        );
      }
    }
    // Gate 2: VLM rejection recommendation
    else if (vlm.available && vlm.recommendation === "REJECTED") {
      decision = "REJECT";
      artifacts.unshift("VLM consistency assessment explicitly flagged rejection.");
    }
    // Gate 3: Threshold routing
    else if (compositeScore >= this.scoringConfig.passThreshold) {
      // If there are warnings, flag for review rather than blind pass
      if (sharpness.isBlurred || exposure.hasClipping) {
        decision = "NEEDS_REVIEW";
      } else {
        decision = "PASS";
      }
    } else if (compositeScore < this.scoringConfig.rejectThreshold) {
      decision = "REJECT";
    } else {
      decision = "NEEDS_REVIEW";
    }

    return {
      foregroundPreservationScore: foreground.preservationScore,
      perceptualSimilarityScore: similarity.similarityScore,
      sharpnessScore: sharpness.sharpnessScore,
      exposureScore: exposure.exposureScore,
      vlmConsistencyScore: vlm.available ? vlm.identityScore : undefined,
      compositeScore,
      decision,
      signals,
    };
  }

  /**
   * Calibrate thresholds against a labelled evaluation dataset
   */
  calibrate(
    evaluatedOutputs: Array<{ calculatedScore: number; groundTruth: QualityDecision }>
  ): CalibrationReport {
    let correctCount = 0;
    let passCount = 0;
    let rejectCount = 0;
    let needsReviewCount = 0;

    for (const item of evaluatedOutputs) {
      let predicted: QualityDecision = "NEEDS_REVIEW";
      if (item.calculatedScore >= this.scoringConfig.passThreshold) {
        predicted = "PASS";
      } else if (item.calculatedScore < this.scoringConfig.rejectThreshold) {
        predicted = "REJECT";
      }

      if (predicted === item.groundTruth) {
        correctCount++;
      }

      if (predicted === "PASS") passCount++;
      else if (predicted === "REJECT") rejectCount++;
      else needsReviewCount++;
    }

    const totalEvaluated = evaluatedOutputs.length;
    const accuracy = totalEvaluated > 0 ? Number((correctCount / totalEvaluated).toFixed(3)) : 1.0;

    return {
      totalEvaluated,
      correctPredictions: correctCount,
      accuracy,
      breakdown: {
        passCount,
        rejectCount,
        needsReviewCount,
      },
      recommendedThresholds: {
        passThreshold: this.scoringConfig.passThreshold,
        rejectThreshold: this.scoringConfig.rejectThreshold,
        criticalFgThreshold: this.scoringConfig.criticalFgThreshold,
      },
    };
  }
}

export const defaultQualityScoringEngine = new QualityScoringEngine();
