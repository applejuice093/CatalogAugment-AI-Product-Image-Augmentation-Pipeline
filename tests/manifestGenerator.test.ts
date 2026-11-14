import { describe, expect, it } from "vitest";
import { ManifestGenerator } from "../server/services/dataset/manifestGenerator.ts";
import type { DatasetManifest } from "../server/services/dataset/types.ts";

describe("ManifestGenerator Unit Tests", () => {
  const generator = new ManifestGenerator();

  const mockManifest: DatasetManifest = {
    datasetId: "ds-123",
    name: "Summer Catalog 2026",
    version: "1.0.0",
    schemaVersion: "1.0.0",
    exportTimestamp: "2026-11-14T10:00:00.000Z",
    splitConfig: {
      trainRatio: 0.7,
      valRatio: 0.15,
      testRatio: 0.15,
      randomSeed: 42,
      includeOriginals: true,
    },
    totalProducts: 1,
    totalImages: 2,
    splitBreakdown: {
      train: { products: 1, images: 2 },
      val: { products: 0, images: 0 },
      test: { products: 0, images: 0 },
    },
    records: [
      {
        id: "item-1",
        productId: "prod-1",
        sku: "SHOE-001",
        split: "train",
        imagePath: "uploads/prod-1/original.png",
        archivePath: "images/train/SHOE-001_item1.png",
        isOriginal: true,
        metadata: {
          productId: "prod-1",
          sku: "SHOE-001",
          productName: "Classic Runner",
          isOriginal: true,
        },
      },
      {
        id: "item-2",
        productId: "prod-1",
        sku: "SHOE-001",
        split: "train",
        imagePath: "uploads/prod-1/augmented.png",
        archivePath: "images/train/SHOE-001_item2.png",
        isOriginal: false,
        metadata: {
          productId: "prod-1",
          sku: "SHOE-001",
          productName: "Classic Runner",
          isOriginal: false,
          workflowId: "wf-01-background-replacement",
          workflowVersion: "1.0.0",
          seed: "42",
          prompt: "clean studio background, soft shadows",
          qualityScore: 92,
          qualityDecision: "APPROVED",
        },
      },
    ],
  };

  it("generateJson outputs valid JSON with expected manifest structure", () => {
    const jsonStr = generator.generateJson(mockManifest);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.datasetId).toBe("ds-123");
    expect(parsed.name).toBe("Summer Catalog 2026");
    expect(parsed.records).toHaveLength(2);
    expect(parsed.records[0].sku).toBe("SHOE-001");
    expect(parsed.records[1].metadata.qualityScore).toBe(92);
  });

  it("generateCsv outputs compliant CSV with escaped headers and values", () => {
    const csvStr = generator.generateCsv(mockManifest);
    const lines = csvStr.split("\n");

    expect(lines.length).toBe(3); // 1 header + 2 records
    expect(lines[0]).toContain("item_id,product_id,sku");
    expect(lines[1]).toContain("SHOE-001");
    expect(lines[2]).toContain("clean studio background");
  });
});
