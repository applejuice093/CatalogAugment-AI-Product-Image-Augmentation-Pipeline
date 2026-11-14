import sharp from "sharp";

export class ConventionalAugmenter {
  /**
   * Generates a conventionally augmented image buffer (horizontal flip + slight exposure adjustment)
   */
  async augment(imageBuffer: Buffer, seed = 1): Promise<Buffer> {
    const pipeline = sharp(imageBuffer);

    // Apply flip based on seed
    if (seed % 2 === 1) {
      pipeline.flop(); // Horizontal flip
    }

    // Apply slight brightness / modulation
    const brightnessMod = 0.95 + (seed % 10) * 0.01; // 0.95 to 1.04
    pipeline.modulate({
      brightness: brightnessMod,
      saturation: 1.02,
    });

    return pipeline.png().toBuffer();
  }
}

export const defaultConventionalAugmenter = new ConventionalAugmenter();
