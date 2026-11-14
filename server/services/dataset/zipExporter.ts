import fs from "node:fs/promises";
import path from "node:path";
import type { Writable } from "node:stream";
import { ZipArchive } from "archiver";
import { config } from "../../config/unifiedConfig.ts";
import type { DatasetManifest } from "./types.ts";

export class ZipExporter {
  /**
   * Validates that all images referenced in the manifest exist on disk and are non-empty
   */
  async validateIntegrity(manifest: DatasetManifest): Promise<{ valid: boolean; missingCount: number }> {
    let missingCount = 0;

    for (const rec of manifest.records) {
      const fullPath = path.resolve(config.storage.uploadRoot, rec.imagePath);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.size === 0) missingCount++;
      } catch {
        missingCount++;
      }
    }

    return {
      valid: missingCount === 0,
      missingCount,
    };
  }

  /**
   * Streams a complete ZIP archive bundle containing manifests and images directly to destination stream
   */
  async streamZip(
    manifest: DatasetManifest,
    jsonContent: string,
    csvContent: string,
    destination: Writable
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const archive = new ZipArchive({
        zlib: { level: 6 },
      });

      destination.on("finish", () => resolve());
      archive.on("error", (err) => reject(err));

      archive.pipe(destination);

      // Append manifests
      archive.append(jsonContent, { name: "manifest.json" });
      archive.append(csvContent, { name: "manifest.csv" });

      // Append image files
      for (const rec of manifest.records) {
        const diskPath = path.resolve(config.storage.uploadRoot, rec.imagePath);
        archive.file(diskPath, { name: rec.archivePath });
      }

      archive.finalize();
    });
  }
}

export const defaultZipExporter = new ZipExporter();
