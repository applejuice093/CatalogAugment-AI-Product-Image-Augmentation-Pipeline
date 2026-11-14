import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ArtifactAnalyzer } from "../server/services/quality/analyzers/artifactAnalyzer.ts";
import { ForegroundPreservationAnalyzer } from "../server/services/quality/analyzers/foregroundPreservationAnalyzer.ts";
import { PerceptualSimilarityAnalyzer } from "../server/services/quality/analyzers/perceptualSimilarityAnalyzer.ts";

describe("Quality Control Analyzers Unit Tests", () => {
  it("ForegroundPreservationAnalyzer returns 100 score for identical images", async () => {
    const analyzer = new ForegroundPreservationAnalyzer();

    const sampleBuffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const maskBuffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const signal = await analyzer.analyze(sampleBuffer, sampleBuffer, maskBuffer);

    expect(signal.preservationScore).toBe(100);
    expect(signal.mse).toBe(0);
    expect(signal.psnr).toBe(100);
  });

  it("ForegroundPreservationAnalyzer penalizes altered foreground pixels", async () => {
    const analyzer = new ForegroundPreservationAnalyzer();

    const origBuffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 200, g: 200, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Severely degraded colorway in augmented version
    const augBuffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 20, g: 20, b: 20, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const maskBuffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const signal = await analyzer.analyze(origBuffer, augBuffer, maskBuffer);

    expect(signal.preservationScore).toBeLessThan(60);
    expect(signal.mse).toBeGreaterThan(1000);
  });

  it("PerceptualSimilarityAnalyzer returns 100% similarity for identical images", async () => {
    const analyzer = new PerceptualSimilarityAnalyzer();

    const sampleBuffer = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 80, g: 90, b: 100 },
      },
    })
      .png()
      .toBuffer();

    const signal = await analyzer.analyze(sampleBuffer, sampleBuffer);

    expect(signal.perceptualDistance).toBe(0);
    expect(signal.similarityScore).toBe(100);
  });

  it("ArtifactAnalyzer flags excessive clipping on over-exposed images", async () => {
    const analyzer = new ArtifactAnalyzer();

    // Image that is 90% blown-out white pixels
    const overExposedBuffer = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const result = await analyzer.analyze(overExposedBuffer);

    expect(result.exposure.hasClipping).toBe(true);
    expect(result.exposure.overExposedRatio).toBeGreaterThan(0.5);
    expect(result.detectedArtifacts.length).toBeGreaterThan(0);
  });
});
