import sharp from "sharp";
import type { QualityExposureSignal, QualitySharpnessSignal } from "../types.ts";

export interface ArtifactAnalysisResult {
  sharpness: QualitySharpnessSignal;
  exposure: QualityExposureSignal;
  detectedArtifacts: string[];
}

export class ArtifactAnalyzer {
  async analyze(imageBuffer: Buffer, targetDim = 256): Promise<ArtifactAnalysisResult> {
    const { data } = await sharp(imageBuffer)
      .resize(targetDim, targetDim, { fit: "fill" })
      .toColourspace("b-w")
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = targetDim * targetDim;

    // 1. Exposure and Clipping analysis
    let underExposedCount = 0;
    let overExposedCount = 0;
    let sumLuminance = 0;

    for (let i = 0; i < totalPixels; i++) {
      const val = data[i];
      sumLuminance += val;
      if (val <= 6) underExposedCount++;
      if (val >= 249) overExposedCount++;
    }

    const underExposedRatio = Number((underExposedCount / totalPixels).toFixed(3));
    const overExposedRatio = Number((overExposedCount / totalPixels).toFixed(3));
    const meanLuminance = sumLuminance / totalPixels;

    // Contrast (standard deviation)
    let varianceSum = 0;
    for (let i = 0; i < totalPixels; i++) {
      const diff = data[i] - meanLuminance;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / totalPixels);

    const hasClipping = underExposedRatio > 0.25 || overExposedRatio > 0.25;

    // Compute exposure score (0-100)
    // Penalize extreme clipping and excessively flat contrast
    let exposureScore = 100;
    if (underExposedRatio > 0.15) exposureScore -= (underExposedRatio - 0.15) * 150;
    if (overExposedRatio > 0.15) exposureScore -= (overExposedRatio - 0.15) * 150;
    if (stdDev < 20) exposureScore -= (20 - stdDev) * 2;
    exposureScore = Math.max(0, Math.min(100, Math.round(exposureScore)));

    // 2. Sharpness & Blur analysis via Laplacian 3x3 filter
    let laplacianSum = 0;
    let laplacianSqSum = 0;
    let interiorPixels = 0;

    for (let y = 1; y < targetDim - 1; y++) {
      for (let x = 1; x < targetDim - 1; x++) {
        const center = data[y * targetDim + x];
        const up = data[(y - 1) * targetDim + x];
        const down = data[(y + 1) * targetDim + x];
        const left = data[y * targetDim + (x - 1)];
        const right = data[y * targetDim + (x + 1)];

        const laplacian = up + down + left + right - 4 * center;
        laplacianSum += laplacian;
        laplacianSqSum += laplacian * laplacian;
        interiorPixels++;
      }
    }

    const meanLaplacian = laplacianSum / interiorPixels;
    const laplacianVariance = laplacianSqSum / interiorPixels - meanLaplacian * meanLaplacian;

    const isBlurred = laplacianVariance < 80;
    // Map laplacian variance to 0-100 sharpness score
    // variance >= 400 is very crisp (100)
    // variance ~200 is good (80)
    // variance < 80 is blurry (< 50)
    const sharpnessScore = Math.max(
      0,
      Math.min(100, Math.round(Math.min(1, Math.sqrt(laplacianVariance) / 20) * 100))
    );

    // 3. Collect detected artifacts
    const detectedArtifacts: string[] = [];
    if (isBlurred) {
      detectedArtifacts.push("Blurry output: insufficient high-frequency edge detail.");
    }
    if (overExposedRatio > 0.25) {
      detectedArtifacts.push("Severe highlight blowout or over-exposure detected.");
    }
    if (underExposedRatio > 0.25) {
      detectedArtifacts.push("Severe shadow clipping or under-exposure detected.");
    }
    if (stdDev < 15) {
      detectedArtifacts.push("Low dynamic range and flat visual contrast.");
    }

    return {
      sharpness: {
        laplacianVariance: Number(laplacianVariance.toFixed(1)),
        sharpnessScore,
        isBlurred,
      },
      exposure: {
        underExposedRatio,
        overExposedRatio,
        exposureScore,
        hasClipping,
      },
      detectedArtifacts,
    };
  }
}
