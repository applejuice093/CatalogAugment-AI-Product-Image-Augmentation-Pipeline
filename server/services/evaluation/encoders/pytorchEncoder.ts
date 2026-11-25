import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { IImageEncoder } from "../types.ts";
import { FeatureImageEncoder } from "./featureEncoder.ts";

const EMBEDDED_PYTHON = "C:\\A\\ComfyUI_windows_portable\\python_embeded\\python.exe";

export class PyTorchImageEncoder implements IImageEncoder {
  readonly name = "pytorch-resnet18-catalogaugment-256";
  readonly dimension = 256;

  private readonly pythonPath = existsSync(EMBEDDED_PYTHON) ? EMBEDDED_PYTHON : "python";
  private readonly scriptPath = path.resolve(process.cwd(), "server/scripts/pytorch_embed.py");
  private readonly fallbackEncoder = new FeatureImageEncoder();
  private readonly cache = new Map<string, number[]>();

  private runPython(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonPath, [this.scriptPath, ...args], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("error", (err) => reject(err));
      proc.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`pytorch_embed.py failed (code ${code}): ${stderr || stdout}`));
        }
      });
    });
  }

  async generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
    const tmpFile = path.join(os.tmpdir(), `ca_query_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    try {
      await fs.writeFile(tmpFile, imageBuffer);
      const out = await this.runPython(["--input", tmpFile]);
      const parsed = JSON.parse(out) as { embedding?: number[] };
      if (Array.isArray(parsed.embedding) && parsed.embedding.length > 0) {
        return parsed.embedding;
      }
      throw new Error("Empty embedding returned from pytorch_embed.py");
    } catch (err) {
      console.warn("[PyTorchImageEncoder] Falling back to FeatureImageEncoder:", err);
      return this.fallbackEncoder.generateEmbedding(imageBuffer);
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }

  /**
   * Batch-embeds a list of image file paths in a single Python process and caches them by path.
   */
  async batchEmbedFiles(filePaths: string[]): Promise<Map<string, number[]>> {
    const uncached = filePaths.filter((p) => !this.cache.has(p));

    if (uncached.length > 0) {
      const tmpJson = path.join(os.tmpdir(), `ca_batch_${Date.now()}.json`);
      try {
        await fs.writeFile(tmpJson, JSON.stringify(uncached), "utf-8");
        const out = await this.runPython(["--inputs-json", tmpJson]);
        const parsed = JSON.parse(out) as { embeddings?: Record<string, number[]> };
        if (parsed.embeddings) {
          for (const [filePath, vec] of Object.entries(parsed.embeddings)) {
            if (Array.isArray(vec) && vec.length > 0) {
              this.cache.set(filePath, vec);
            }
          }
        }
      } catch (err) {
        console.warn("[PyTorchImageEncoder] Batch embed failed, falling back per file:", err);
        for (const p of uncached) {
          try {
            const buf = await fs.readFile(p);
            this.cache.set(p, await this.fallbackEncoder.generateEmbedding(buf));
          } catch {
            // skip unreadable
          }
        }
      } finally {
        await fs.unlink(tmpJson).catch(() => {});
      }
    }

    const result = new Map<string, number[]>();
    for (const p of filePaths) {
      const vec = this.cache.get(p);
      if (vec) result.set(p, vec);
    }
    return result;
  }
}

export const defaultPyTorchEncoder = new PyTorchImageEncoder();
