import sharp from "sharp";
import type { IImageEncoder } from "../types.ts";

export class FeatureImageEncoder implements IImageEncoder {
  readonly name = "feature-tensor-512";
  readonly dimension = 512;

  /**
   * Generates a 512-dimensional L2-normalized visual feature vector from an image buffer
   */
  async generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
    const targetDim = 64;
    const { data } = await sharp(imageBuffer)
      .resize(targetDim, targetDim, { fit: "fill" })
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });

    const vector: number[] = new Array(this.dimension).fill(0);
    const totalPixels = targetDim * targetDim;

    // 1. Spatial color grid (8x8 cells across 3 channels = 192 dimensions)
    const gridSize = 8;
    const cellSize = targetDim / gridSize;

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let cellCount = 0;

        for (let cy = 0; cy < cellSize; cy++) {
          for (let cx = 0; cx < cellSize; cx++) {
            const px = gx * cellSize + cx;
            const py = gy * cellSize + cy;
            const idx = (py * targetDim + px) * 3;

            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            cellCount++;
          }
        }

        const cellIdx = gy * gridSize + gx;
        vector[cellIdx] = rSum / (cellCount * 255);
        vector[64 + cellIdx] = gSum / (cellCount * 255);
        vector[128 + cellIdx] = bSum / (cellCount * 255);
      }
    }

    // 2. Color distribution histograms (16 bins x 3 channels = 48 dimensions)
    const histOffset = 192;
    for (let i = 0; i < totalPixels; i++) {
      const rBin = Math.min(15, Math.floor(data[i * 3] / 16));
      const gBin = Math.min(15, Math.floor(data[i * 3 + 1] / 16));
      const bBin = Math.min(15, Math.floor(data[i * 3 + 2] / 16));

      vector[histOffset + rBin] += 1 / totalPixels;
      vector[histOffset + 16 + gBin] += 1 / totalPixels;
      vector[histOffset + 32 + bBin] += 1 / totalPixels;
    }

    // 3. 8x8 Spatial gradient/Laplacian edge response (64 dimensions)
    const edgeOffset = 240;
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let edgeSum = 0;
        let cellCount = 0;

        for (let cy = 1; cy < cellSize - 1; cy++) {
          for (let cx = 1; cx < cellSize - 1; cx++) {
            const px = gx * cellSize + cx;
            const py = gy * cellSize + cy;
            const center = data[(py * targetDim + px) * 3];
            const left = data[(py * targetDim + (px - 1)) * 3];
            const right = data[(py * targetDim + (px + 1)) * 3];
            const up = data[((py - 1) * targetDim + px) * 3];
            const down = data[((py + 1) * targetDim + px) * 3];

            const laplacian = Math.abs(up + down + left + right - 4 * center);
            edgeSum += laplacian;
            cellCount++;
          }
        }

        const cellIdx = gy * gridSize + gx;
        vector[edgeOffset + cellIdx] = cellCount > 0 ? edgeSum / (cellCount * 255) : 0;
      }
    }

    // 4. Frequency/texture projections (remaining 208 dimensions)
    const textureOffset = 304;
    const remainingBins = this.dimension - textureOffset;
    for (let i = 0; i < remainingBins; i++) {
      const step = Math.floor(totalPixels / remainingBins);
      let lumSum = 0;
      for (let j = 0; j < step; j++) {
        const pIdx = (i * step + j) * 3;
        lumSum += (data[pIdx] * 0.299 + data[pIdx + 1] * 0.587 + data[pIdx + 2] * 0.114) / 255;
      }
      vector[textureOffset + i] = lumSum / step;
    }

    // 5. L2 Normalization so dot product equals cosine similarity
    let normSq = 0;
    for (let i = 0; i < this.dimension; i++) {
      normSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(normSq) || 1;

    for (let i = 0; i < this.dimension; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }

    return vector;
  }
}

export const defaultFeatureEncoder = new FeatureImageEncoder();
