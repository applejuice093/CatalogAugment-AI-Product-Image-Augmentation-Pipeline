import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { FeatureImageEncoder } from "../server/services/evaluation/encoders/featureEncoder.ts";

describe("FeatureImageEncoder Unit Tests", () => {
  const encoder = new FeatureImageEncoder();

  it("extracts 512-dimensional normalized vector with unit L2 norm", async () => {
    const imgBuf = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 120, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const embedding = await encoder.generateEmbedding(imgBuf);

    expect(embedding).toHaveLength(512);

    // Check L2 norm is ~1.0
    let normSq = 0;
    for (const val of embedding) {
      normSq += val * val;
    }
    const norm = Math.sqrt(normSq);
    expect(norm).toBeCloseTo(1.0, 2);
  });

  it("produces dot product of 1.0 for identical image", async () => {
    const imgBuf = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 250, g: 50, b: 50 },
      },
    })
      .png()
      .toBuffer();

    const emb1 = await encoder.generateEmbedding(imgBuf);
    const emb2 = await encoder.generateEmbedding(imgBuf);

    let dot = 0;
    for (let i = 0; i < 512; i++) {
      dot += emb1[i] * emb2[i];
    }

    expect(dot).toBeCloseTo(1.0, 3);
  });

  it("produces lower cosine similarity for contrasting images", async () => {
    const redBuf = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    const blueBuf = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .png()
      .toBuffer();

    const embRed = await encoder.generateEmbedding(redBuf);
    const embBlue = await encoder.generateEmbedding(blueBuf);

    let dot = 0;
    for (let i = 0; i < 512; i++) {
      dot += embRed[i] * embBlue[i];
    }

    expect(dot).toBeLessThan(0.7);
  });
});
