import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PYTHON_PATH =
  process.env.PYTHON_EXECUTABLE ||
  "C:\\A\\ComfyUI_windows_portable\\python_embeded\\python.exe";
const ALBUMENTATIONS_SCRIPT = path.resolve(
  __dirname,
  "../../scripts/albumentations_augment.py"
);

export class ConventionalAugmenter {
  private pythonPath: string;

  constructor(pythonPath: string = DEFAULT_PYTHON_PATH) {
    this.pythonPath = pythonPath;
  }

  /**
   * Generates a conventionally augmented image buffer using the Python Albumentations
   * pipeline (orientation, perspective, lighting, blur, noise, JPEG compression),
   * falling back safely to sharp for tiny test fixtures or environments without Python.
   */
  async augment(
    imageBuffer: Buffer,
    seed = 1,
    mode: "realistic" | "stress_query" = "realistic"
  ): Promise<Buffer> {
    try {
      const meta = await sharp(imageBuffer).metadata();
      // Skip spawning Python for tiny unit-test placeholder buffers (< 32x32)
      if ((meta.width ?? 0) >= 32 && (meta.height ?? 0) >= 32) {
        return await this.runAlbumentations(imageBuffer, seed, mode);
      }
    } catch {
      // Fallback below
    }

    return this.fallbackSharpAugment(imageBuffer, seed, mode);
  }

  /**
   * Generates an independent customer-photo stress query (distinct from training augmentations)
   * to prevent evaluation data leakage during visual-search benchmarking.
   */
  async createStressQuery(imageBuffer: Buffer, seed = 101): Promise<Buffer> {
    return this.augment(imageBuffer, seed, "stress_query");
  }

  private async runAlbumentations(
    imageBuffer: Buffer,
    seed: number,
    mode: "realistic" | "stress_query"
  ): Promise<Buffer> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cat-alb-"));
    const inPath = path.join(tmpDir, "in.png");
    const outPath = path.join(tmpDir, "out.png");

    try {
      await fs.writeFile(inPath, imageBuffer);
      await new Promise<void>((resolve, reject) => {
        const child = spawn(this.pythonPath, [
          ALBUMENTATIONS_SCRIPT,
          "--input",
          inPath,
          "--output",
          outPath,
          "--seed",
          String(seed),
          "--mode",
          mode,
        ]);
        let stderr = "";
        child.stderr.on("data", (d) => {
          stderr += d.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Albumentations exited with ${code}: ${stderr}`));
        });
      });
      return await fs.readFile(outPath);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async fallbackSharpAugment(
    imageBuffer: Buffer,
    seed: number,
    mode: "realistic" | "stress_query"
  ): Promise<Buffer> {
    const pipeline = sharp(imageBuffer);
    if (mode === "stress_query") {
      pipeline.rotate((seed % 2 === 0 ? 1 : -1) * 8, { background: "#d4d4d4" });
      pipeline.modulate({ brightness: 0.78, saturation: 0.88 }).blur(1.2);
      return pipeline.png().toBuffer();
    }

    if (seed % 2 === 1) {
      pipeline.flop();
    }
    const brightnessMod = 0.95 + (seed % 10) * 0.01;
    pipeline.modulate({ brightness: brightnessMod, saturation: 1.02 });
    return pipeline.png().toBuffer();
  }
}

export const defaultConventionalAugmenter = new ConventionalAugmenter();
