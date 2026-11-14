import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageNormalizationService } from "../server/services/imageNormalizationService.ts";

describe("ImageNormalizationService Unit Tests", () => {
  const service = new ImageNormalizationService();

  it("normalizes a valid image buffer, calculates aspect ratio and converts to sRGB", async () => {
    // Generate a valid 200x100 test PNG
    const testImage = await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.normalizeImage(testImage);

    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
    expect(result.aspectRatio).toBe(2);
    expect(result.format).toBe("png");
    expect(result.mime).toBe("image/png");
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("converts output to requested target mime format", async () => {
    const testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const jpegResult = await service.normalizeImage(testImage, "image/jpeg");
    expect(jpegResult.format).toBe("jpeg");
    expect(jpegResult.mime).toBe("image/jpeg");

    const webpResult = await service.normalizeImage(testImage, "image/webp");
    expect(webpResult.format).toBe("webp");
    expect(webpResult.mime).toBe("image/webp");
  });

  it("rejects corrupt or non-image buffer", async () => {
    const corruptBuffer = Buffer.from("this-is-not-a-valid-image-file");

    await expect(service.normalizeImage(corruptBuffer)).rejects.toThrow("Corrupt or unsupported image file");
  });

  it("rejects empty buffer", async () => {
    const emptyBuffer = Buffer.alloc(0);

    await expect(service.normalizeImage(emptyBuffer)).rejects.toThrow("Empty image buffer");
  });

  it("rejects images with dimensions outside allowed bounds", async () => {
    // 10x10 is smaller than MIN_DIMENSION (32)
    const tinyImage = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    await expect(service.normalizeImage(tinyImage)).rejects.toThrow("outside acceptable bounds");
  });
});
