import { describe, expect, it } from "vitest";
import { QualityScoringEngine } from "../server/services/quality/qualityScoringEngine.ts";
import type { QualitySignals } from "../server/services/quality/types.ts";

describe("QualityScoringEngine Unit Tests", () => {
  const engine = new QualityScoringEngine({
    passThreshold: 80,
    rejectThreshold: 50,
    criticalFgThreshold: 65,
  });

  const baseSignals: QualitySignals = {
    foreground: { psnr: 38, mse: 12, maskedPixelCount: 5000, preservationScore: 95 },
    similarity: { perceptualDistance: 2, similarityScore: 92 },
    sharpness: { laplacianVariance: 250, sharpnessScore: 90, isBlurred: false },
    exposure: { underExposedRatio: 0.02, overExposedRatio: 0.03, exposureScore: 95, hasClipping: false },
    artifacts: [],
    vlm: { available: true, identityScore: 94, recommendation: "APPROVED" },
  };

  it("evaluates high quality variant to PASS", () => {
    const result = engine.evaluate(baseSignals);

    expect(result.decision).toBe("PASS");
    expect(result.compositeScore).toBeGreaterThanOrEqual(80);
    expect(result.signals.artifacts).toHaveLength(0);
  });

  it("triggers immediate REJECT when foreground preservation is below critical threshold", () => {
    const degradedSignals: QualitySignals = {
      ...baseSignals,
      foreground: { psnr: 18, mse: 1200, maskedPixelCount: 5000, preservationScore: 45 },
    };

    const result = engine.evaluate(degradedSignals);

    expect(result.decision).toBe("REJECT");
    expect(result.signals.artifacts.some((a) => a.includes("Foreground identity"))).toBe(true);
  });

  it("routes to NEEDS_REVIEW when quality score is borderline", () => {
    const borderlineSignals: QualitySignals = {
      ...baseSignals,
      foreground: { psnr: 28, mse: 80, maskedPixelCount: 5000, preservationScore: 72 },
      similarity: { perceptualDistance: 15, similarityScore: 70 },
      sharpness: { laplacianVariance: 120, sharpnessScore: 65, isBlurred: false },
      exposure: { underExposedRatio: 0.1, overExposedRatio: 0.1, exposureScore: 70, hasClipping: false },
      vlm: { available: false },
    };

    const result = engine.evaluate(borderlineSignals);

    expect(result.decision).toBe("NEEDS_REVIEW");
    expect(result.compositeScore).toBeGreaterThanOrEqual(50);
    expect(result.compositeScore).toBeLessThan(80);
  });

  it("calibrates thresholds against ground-truth labels and calculates accuracy", () => {
    const evaluatedSamples = [
      { calculatedScore: 90, groundTruth: "PASS" as const },
      { calculatedScore: 85, groundTruth: "PASS" as const },
      { calculatedScore: 40, groundTruth: "REJECT" as const },
      { calculatedScore: 35, groundTruth: "REJECT" as const },
      { calculatedScore: 68, groundTruth: "NEEDS_REVIEW" as const },
    ];

    const report = engine.calibrate(evaluatedSamples);

    expect(report.totalEvaluated).toBe(5);
    expect(report.correctPredictions).toBe(5);
    expect(report.accuracy).toBe(1.0);
    expect(report.breakdown.passCount).toBe(2);
    expect(report.breakdown.rejectCount).toBe(2);
    expect(report.breakdown.needsReviewCount).toBe(1);
  });
});
