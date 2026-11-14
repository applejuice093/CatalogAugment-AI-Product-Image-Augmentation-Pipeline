import sharp from "sharp";

export interface CompositingOptions {
  featherRadius?: number;
  preserveOriginalForeground?: boolean;
  enableEdgeRefinement?: boolean;
  opacity?: number;
}

export interface CompositingResult {
  compositeBuffer: Buffer;
  width: number;
  height: number;
  isComposited: boolean;
  strategy: string;
}

export class ForegroundCompositingService {
  /**
   * Refines edges and composites the original untouched product foreground
   * directly over the generated ComfyUI background.
   */
  async composite(
    generatedBackgroundBuffer: Buffer,
    originalProductBuffer: Buffer,
    maskBuffer: Buffer,
    options: CompositingOptions = {}
  ): Promise<CompositingResult> {
    const {
      featherRadius = 1.5,
      preserveOriginalForeground = true,
      enableEdgeRefinement = true,
    } = options;

    if (!preserveOriginalForeground) {
      const bgMetadata = await sharp(generatedBackgroundBuffer).metadata();
      return {
        compositeBuffer: generatedBackgroundBuffer,
        width: bgMetadata.width ?? 0,
        height: bgMetadata.height ?? 0,
        isComposited: false,
        strategy: "none",
      };
    }

    // 1. Get background dimensions
    const bgSharp = sharp(generatedBackgroundBuffer);
    const bgMetadata = await bgSharp.metadata();
    const targetWidth = bgMetadata.width ?? 1024;
    const targetHeight = bgMetadata.height ?? 1024;

    // 2. Extract original product RGB raw buffer resized to target
    const origRgbRaw = await sharp(originalProductBuffer)
      .resize(targetWidth, targetHeight, { fit: "contain", background: "#000000" })
      .removeAlpha()
      .raw()
      .toBuffer();

    // 3. Process and feather the mask to extract alpha raw buffer
    let maskPipeline = sharp(maskBuffer)
      .resize(targetWidth, targetHeight, { fit: "contain", background: "#000000" })
      .grayscale();

    if (enableEdgeRefinement && featherRadius > 0) {
      maskPipeline = maskPipeline.blur(featherRadius);
    }

    const maskAlphaRaw = await maskPipeline.raw().toBuffer();

    // 4. Assemble transparent product foreground RGBA buffer
    const pixelCount = targetWidth * targetHeight;
    const rgbaBuffer = Buffer.alloc(pixelCount * 4);

    for (let i = 0; i < pixelCount; i++) {
      rgbaBuffer[i * 4] = origRgbRaw[i * 3]; // R
      rgbaBuffer[i * 4 + 1] = origRgbRaw[i * 3 + 1]; // G
      rgbaBuffer[i * 4 + 2] = origRgbRaw[i * 3 + 2]; // B
      rgbaBuffer[i * 4 + 3] = maskAlphaRaw[i]; // Alpha from mask
    }

    const foregroundCutout = await sharp(rgbaBuffer, {
      raw: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
      },
    })
      .png()
      .toBuffer();

    // 5. Composite feathered foreground on top of generated background
    const compositeBuffer = await sharp(generatedBackgroundBuffer)
      .composite([
        {
          input: foregroundCutout,
          blend: "over",
        },
      ])
      .png({ quality: 95 })
      .toBuffer();

    return {
      compositeBuffer,
      width: targetWidth,
      height: targetHeight,
      isComposited: true,
      strategy: enableEdgeRefinement ? "alpha_feathered" : "binary_alpha",
    };
  }
}

export const defaultForegroundCompositingService = new ForegroundCompositingService();
