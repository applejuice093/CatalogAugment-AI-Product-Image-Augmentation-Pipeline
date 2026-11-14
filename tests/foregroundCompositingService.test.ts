import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ForegroundCompositingService } from "../server/services/foregroundCompositingService.ts";

describe("ForegroundCompositingService Unit Tests", () => {
  it("composites original foreground over generated background with refined alpha mask", async () => {
    const service = new ForegroundCompositingService();

    // Create 128x128 green background
    const bgBuffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    // Create 128x128 red product foreground
    const fgBuffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    // Create 128x128 binary mask with a white 64x64 center square
    const maskBuffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 64,
              height: 64,
              channels: 3,
              background: { r: 255, g: 255, b: 255 },
            },
          })
            .png()
            .toBuffer(),
          top: 32,
          left: 32,
        },
      ])
      .png()
      .toBuffer();

    const result = await service.composite(bgBuffer, fgBuffer, maskBuffer, {
      featherRadius: 1.5,
      preserveOriginalForeground: true,
      enableEdgeRefinement: true,
    });

    expect(result.isComposited).toBe(true);
    expect(result.strategy).toBe("alpha_feathered");
    expect(result.width).toBe(128);
    expect(result.height).toBe(128);

    // Inspect composite pixels: center should be red (product foreground)
    const { data, info } = await sharp(result.compositeBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Pixel at center (64, 64) -> index = (64 * 128 + 64) * info.channels
    const centerIdx = (64 * 128 + 64) * info.channels;
    expect(data[centerIdx]).toBeGreaterThan(200); // Red channel high
    expect(data[centerIdx + 1]).toBeLessThan(60); // Green channel low

    // Pixel at corner (10, 10) -> index = (10 * 128 + 10) * info.channels -> should be green background
    const cornerIdx = (10 * 128 + 10) * info.channels;
    expect(data[cornerIdx]).toBeLessThan(60); // Red channel low
    expect(data[cornerIdx + 1]).toBeGreaterThan(200); // Green channel high
  });

  it("bypasses compositing when preserveOriginalForeground is false", async () => {
    const service = new ForegroundCompositingService();
    const dummyBg = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.composite(dummyBg, dummyBg, dummyBg, {
      preserveOriginalForeground: false,
    });

    expect(result.isComposited).toBe(false);
    expect(result.strategy).toBe("none");
    expect(result.compositeBuffer).toEqual(dummyBg);
  });
});
