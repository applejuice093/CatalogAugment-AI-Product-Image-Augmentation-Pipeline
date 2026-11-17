import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { IImageEncoder } from "../types.ts";
import { defaultFeatureEncoder } from "./featureEncoder.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PYTHON_PATH =
  process.env.PYTHON_EXECUTABLE ||
  "C:\\A\\ComfyUI_windows_portable\\python_embeded\\python.exe";
const PYTORCH_EMBED_SCRIPT = path.resolve(
  __dirname,
  "../../../scripts/pytorch_embed.py"
);

/**
 * PyTorch ResNet-18 Visual-Search Embedding Encoder.
 * Uses the fine-tuned CatalogAugment ResNet-18 checkpoint (256-dim L2-normalized)
 * when available, falling back cleanly to the lightweight feature encoder for
 * tiny unit-test fixtures or environments without Python/PyTorch.
 */
export class PyTorchImageEncoder implements IImageEncoder {
  readonly name = "pytorch-resnet18-catalogaugment";
  readonly dimension = 256;
  private pythonPath: string;

  constructor(pythonPath: string = DEFAULT_PYTHON_PATH) {
    this.pythonPath = pythonPath;
  }

  async generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
    try {
      const meta = await sharp(imageBuffer).metadata();
      if ((meta.width ?? 0) < 32 || (meta.height ?? 0) < 32) {
        return defaultFeatureEncoder.generateEmbedding(imageBuffer);
      }

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cat-torch-"));
      const inPath = path.join(tmpDir, "img.png");
      try {
        await fs.writeFile(inPath, imageBuffer);
        const stdout = await new Promise<string>((resolve, reject) => {
          const child = spawn(this.pythonPath, [PYTORCH_EMBED_SCRIPT, "--input", inPath]);
          let out = "";
          let err = "";
          child.stdout.on("data", (d) => (out += d.toString()));
          child.stderr.on("data", (d) => (err += d.toString()));
          child.on("error", reject);
          child.on("close", (code) => {
            if (code === 0) resolve(out);
            else reject(new Error(`PyTorch embed exited with ${code}: ${err}`));
          });
        });

        const parsed = JSON.parse(stdout.trim()) as { embedding?: number[] };
        if (Array.isArray(parsed.embedding) && parsed.embedding.length > 0) {
          return parsed.embedding;
        }
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    } catch {
      // Fallback for offline / unit-test environments
    }

    return defaultFeatureEncoder.generateEmbedding(imageBuffer);
  }
}

export const defaultPyTorchEncoder = new PyTorchImageEncoder();
