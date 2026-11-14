import type { DatasetManifest } from "./types.ts";

export class ManifestGenerator {
  /**
   * Generates formatted JSON manifest adhering to Master Prompt Section 7 schema
   */
  generateJson(manifest: DatasetManifest): string {
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Generates RFC-4180 compliant CSV metadata manifest
   */
  generateCsv(manifest: DatasetManifest): string {
    const headers = [
      "item_id",
      "product_id",
      "sku",
      "product_name",
      "split",
      "is_original",
      "image_path",
      "archive_path",
      "workflow_id",
      "workflow_version",
      "seed",
      "prompt",
      "vlm_provider",
      "quality_score",
      "quality_decision",
    ];

    const lines: string[] = [headers.join(",")];

    for (const rec of manifest.records) {
      const meta = rec.metadata;
      const row = [
        this.escapeCsv(rec.id),
        this.escapeCsv(rec.productId),
        this.escapeCsv(rec.sku),
        this.escapeCsv(meta.productName || ""),
        this.escapeCsv(rec.split),
        meta.isOriginal ? "true" : "false",
        this.escapeCsv(rec.imagePath),
        this.escapeCsv(rec.archivePath),
        this.escapeCsv(meta.workflowId || ""),
        this.escapeCsv(meta.workflowVersion || ""),
        this.escapeCsv(meta.seed !== undefined ? String(meta.seed) : ""),
        this.escapeCsv(meta.prompt || ""),
        this.escapeCsv(meta.vlmProvider || ""),
        meta.qualityScore !== undefined ? String(meta.qualityScore) : "",
        this.escapeCsv(meta.qualityDecision || ""),
      ];

      lines.push(row.join(","));
    }

    return lines.join("\n");
  }

  private escapeCsv(val: string): string {
    if (!val) return '""';
    if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return `"${val}"`;
  }
}

export const defaultManifestGenerator = new ManifestGenerator();
