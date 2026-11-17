import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config/unifiedConfig.ts";

export type AnglePreset =
  | "THREE_QUARTER_YAW"
  | "FLAT_LAY_TOPDOWN"
  | "LOW_ANGLE_HERO"
  | "CASUAL_HANDHELD_TILT"
  | "FRONTAL_STUDIO";

export interface PerspectiveTransformOptions {
  preset?: AnglePreset;
  outputDir?: string;
  prefix?: string;
  customParams?: {
    yaw?: number;
    pitch?: number;
    roll?: number;
    scale?: number;
    dx?: number;
    dy?: number;
  };
}

export interface PerspectiveTransformResult {
  preset: string;
  description: string;
  suggestedPrompt: string;
  parameters: {
    yaw: number;
    pitch: number;
    roll: number;
    scale: number;
    dx: number;
    dy: number;
  };
  bbox: {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
  };
  paths: {
    cutout: string;
    mask: string;
    rgb: string;
  };
}

export class GeometricTransformationService {
  private pythonPath: string;
  private scriptPath: string;

  constructor(
    pythonPath: string = "C:\\A\\ComfyUI_windows_portable\\python_embeded\\python.exe",
    scriptPath: string = path.resolve(__dirname, "../scripts/transform_perspective.py")
  ) {
    this.pythonPath = pythonPath;
    this.scriptPath = scriptPath;
  }

  /**
   * Applies 3D perspective homography warping to an image and its segmentation mask.
   */
  async transformPerspective(
    imagePath: string,
    maskPath: string,
    options: PerspectiveTransformOptions = {}
  ): Promise<PerspectiveTransformResult> {
    const preset = options.preset || "THREE_QUARTER_YAW";
    const outputDir =
      options.outputDir ||
      path.join(config.storage.uploadRoot, "transformed_angles", new Date().toISOString().slice(0, 10));
    const prefix = options.prefix || `angle_${Date.now()}_${preset.toLowerCase()}`;

    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const args = [
        this.scriptPath,
        "--image",
        path.resolve(imagePath),
        "--mask",
        path.resolve(maskPath),
        "--preset",
        preset,
        "--output_dir",
        path.resolve(outputDir),
        "--prefix",
        prefix,
        "--json",
      ];

      const child = spawn(this.pythonPath, args);
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Error(`Perspective transformation failed (code ${code}): ${stderr || stdout}`)
          );
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({
            preset: parsed.preset,
            description: parsed.description,
            suggestedPrompt: parsed.suggested_prompt,
            parameters: parsed.parameters,
            bbox: parsed.bbox,
            paths: parsed.paths,
          });
        } catch (err) {
          reject(new Error(`Failed to parse transformation JSON: ${stdout}`));
        }
      });
    });
  }
}

export const defaultGeometricTransformationService = new GeometricTransformationService();
