import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ISegmentationProvider,
  SegmentationOutput,
  SegmentationService,
} from "../server/services/segmentationService.ts";

describe("SegmentationService Unit Tests", () => {
  it("processes segmentation and returns valid mask and foreground buffers", async () => {
    const service = new SegmentationService();

    // Create a 120x120 test image with a dark product on light background
    const inputBuffer = await sharp({
      create: {
        width: 120,
        height: 120,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 60,
              height: 60,
              channels: 3,
              background: { r: 20, g: 20, b: 20 },
            },
          })
            .png()
            .toBuffer(),
          top: 30,
          left: 30,
        },
      ])
      .png()
      .toBuffer();

    const result = await service.processSegmentation("test-img-001", inputBuffer);

    expect(result.inputImageId).toBe("test-img-001");
    expect(result.status).toBe("COMPLETED");
    expect(result.modelName).toBe("rembg-u2net-standalone");
    expect(result.maskBuffer).toBeInstanceOf(Buffer);
    expect(result.foregroundBuffer).toBeInstanceOf(Buffer);

    // Verify mask is a valid PNG
    const maskMeta = await sharp(result.maskBuffer).metadata();
    expect(maskMeta.format).toBe("png");
    expect(maskMeta.width).toBe(120);
    expect(maskMeta.height).toBe(120);
  });

  it("supports swapping segmentation providers", async () => {
    const customProvider: ISegmentationProvider = {
      name: "custom-mock-vlm-segmenter",
      version: "2.1.0",
      segment: async (id: string, buf: Buffer): Promise<SegmentationOutput> => ({
        inputImageId: id,
        maskBuffer: buf,
        foregroundBuffer: buf,
        status: "COMPLETED",
        modelName: "custom-mock-vlm-segmenter",
        modelVersion: "2.1.0",
        confidence: 0.99,
      }),
    };

    const service = new SegmentationService();
    service.setProvider(customProvider);

    const info = service.getProviderInfo();
    expect(info.name).toBe("custom-mock-vlm-segmenter");
    expect(info.version).toBe("2.1.0");

    const dummy = Buffer.from("dummy");
    const output = await service.processSegmentation("test-id", dummy);
    expect(output.modelName).toBe("custom-mock-vlm-segmenter");
  });
});
