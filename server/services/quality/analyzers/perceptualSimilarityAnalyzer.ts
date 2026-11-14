import sharp from "sharp";
import type { QualitySimilaritySignal } from "../types.ts";

export class PerceptualSimilarityAnalyzer {
  /**
   * Computes perceptual difference hash (dHash) and calculates visual similarity score
   */
  async analyze(
    originalBuffer: Buffer,
    augmentedBuffer: Buffer
  ): Promise<QualitySimilaritySignal> {
    const origHash = await this.computeDHash(originalBuffer);
    const augHash = await this.computeDHash(augmentedBuffer);

    const hammingDistance = this.computeHammingDistance(origHash, augHash);
    const maxBits = 64;

    // 0 distance means identical structural gradient pattern (100% similarity)
    // <= 10 distance means very close composition (> 84% similarity)
    // >= 32 distance means distinct composition
    const similarityScore = Math.max(
      0,
      Math.min(100, Math.round(((maxBits - hammingDistance) / maxBits) * 100))
    );

    return {
      perceptualDistance: hammingDistance,
      similarityScore,
    };
  }

  private async computeDHash(imageBuffer: Buffer): Promise<bigint> {
    // 9 cols x 8 rows grayscale image
    const { data } = await sharp(imageBuffer)
      .resize(9, 8, { fit: "fill" })
      .toColourspace("b-w")
      .raw()
      .toBuffer({ resolveWithObject: true });

    let hash = 0n;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        if (left < right) {
          hash |= 1n << BigInt(row * 8 + col);
        }
      }
    }

    return hash;
  }

  private computeHammingDistance(hashA: bigint, hashB: bigint): number {
    let xor = hashA ^ hashB;
    let distance = 0;
    while (xor > 0n) {
      if (xor & 1n) distance++;
      xor >>= 1n;
    }
    return distance;
  }
}
