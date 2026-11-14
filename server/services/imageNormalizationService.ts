import sharp from "sharp";

export interface NormalizedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  channels: number;
  aspectRatio: number;
  mime: string;
}

export class ImageNormalizationService {
  private readonly MAX_DIMENSION = 8192;
  private readonly MIN_DIMENSION = 32;

  async normalizeImage(inputBuffer: Buffer, targetMime?: string): Promise<NormalizedImageResult> {
    if (!inputBuffer || inputBuffer.length === 0) {
      throw new Error("Empty image buffer supplied for normalization.");
    }

    let pipeline = sharp(inputBuffer, { failOnError: true });

    let metadata: sharp.Metadata;
    try {
      metadata = await pipeline.metadata();
    } catch (err) {
      throw new Error(
        `Corrupt or unsupported image file: ${err instanceof Error ? err.message : "unable to decode image header"}`
      );
    }

    if (!metadata.width || !metadata.height) {
      throw new Error("Image has invalid or zero dimensions.");
    }

    if (
      metadata.width < this.MIN_DIMENSION ||
      metadata.height < this.MIN_DIMENSION ||
      metadata.width > this.MAX_DIMENSION ||
      metadata.height > this.MAX_DIMENSION
    ) {
      throw new Error(
        `Image dimensions (${metadata.width}x${metadata.height}) outside acceptable bounds [${this.MIN_DIMENSION}px - ${this.MAX_DIMENSION}px].`
      );
    }

    // 1. Correct EXIF orientation automatically
    pipeline = pipeline.rotate();

    // 2. Ensure sRGB colorspace for consistency across downstream diffusion and vision models
    pipeline = pipeline.toColorspace("srgb");

    // 3. Format output
    let outputMime = "image/png";
    if (targetMime === "image/jpeg" || (!targetMime && metadata.format === "jpeg")) {
      pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
      outputMime = "image/jpeg";
    } else if (targetMime === "image/webp" || (!targetMime && metadata.format === "webp")) {
      pipeline = pipeline.webp({ quality: 90 });
      outputMime = "image/webp";
    } else {
      pipeline = pipeline.png({ compressionLevel: 8 });
      outputMime = "image/png";
    }

    const { data: outputBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

    return {
      buffer: outputBuffer,
      width: info.width,
      height: info.height,
      format: info.format,
      channels: info.channels,
      aspectRatio: Number((info.width / info.height).toFixed(4)),
      mime: outputMime,
    };
  }
}

export const imageNormalizationService = new ImageNormalizationService();
