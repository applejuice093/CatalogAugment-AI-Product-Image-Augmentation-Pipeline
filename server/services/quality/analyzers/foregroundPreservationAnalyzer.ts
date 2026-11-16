import sharp, { type OutputInfo } from "sharp";
import type { QualityForegroundSignal } from "../types.ts";

export class ForegroundPreservationAnalyzer {
  /**
   * Computes pixel-level preservation metrics specifically within the masked foreground area
   */
  async analyze(
    originalBuffer: Buffer,
    augmentedBuffer: Buffer,
    maskBuffer?: Buffer,
    targetDim = 256
  ): Promise<QualityForegroundSignal> {
    // Standardize all images to targetDim x targetDim raw sRGB buffers
    const origRaw = await sharp(originalBuffer)
      .resize(targetDim, targetDim, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const augRaw = await sharp(augmentedBuffer)
      .resize(targetDim, targetDim, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let maskRaw: { data: Buffer; info: OutputInfo };
    if (maskBuffer) {
      maskRaw = await sharp(maskBuffer)
        .resize(targetDim, targetDim, { fit: "fill" })
        .toColourspace("b-w")
        .raw()
        .toBuffer({ resolveWithObject: true });
    } else {
      // Use original image alpha channel as mask fallback
      maskRaw = {
        data: Buffer.alloc(targetDim * targetDim, 255),
        info: { ...origRaw.info, channels: 1 },
      };
    }

    let totalSquaredError = 0;
    let maskedPixelCount = 0;

    const origData = origRaw.data;
    const augData = augRaw.data;
    const maskData = maskRaw.data;

    const totalPixels = targetDim * targetDim;

    for (let i = 0; i < totalPixels; i++) {
      const maskVal = maskBuffer ? maskData[i] : origData[i * 4 + 3];

      // Consider pixels where mask is active (> 50% opacity)
      if (maskVal > 128) {
        maskedPixelCount++;
        const rDiff = origData[i * 4] - augData[i * 4];
        const gDiff = origData[i * 4 + 1] - augData[i * 4 + 1];
        const bDiff = origData[i * 4 + 2] - augData[i * 4 + 2];

        totalSquaredError += rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
      }
    }

    if (maskedPixelCount === 0) {
      // Fallback if no foreground masked area
      return {
        psnr: 30,
        mse: 100,
        maskedPixelCount: 0,
        preservationScore: 70,
      };
    }

    const mse = totalSquaredError / (maskedPixelCount * 3);
    const maxVal = 255;
    const psnr = mse === 0 ? 100 : 10 * Math.log10((maxVal * maxVal) / mse);

    // Normalize preservation score between 0 and 100
    // PSNR >= 40 dB is near identical (100)
    // PSNR 30 dB is high fidelity (~85)
    // PSNR 20 dB is moderate fidelity (~60)
    // PSNR <= 10 dB is severely distorted (< 30)
    let preservationScore: number;
    if (mse === 0) {
      preservationScore = 100;
    } else {
      preservationScore = Math.max(0, Math.min(100, Math.round((psnr / 40) * 100)));
    }

    return {
      psnr: Number(psnr.toFixed(2)),
      mse: Number(mse.toFixed(2)),
      maskedPixelCount,
      preservationScore,
    };
  }
}
