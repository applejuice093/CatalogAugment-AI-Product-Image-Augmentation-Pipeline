import { describe, expect, it } from "vitest";
import { DatasetSplitter } from "../server/services/dataset/datasetSplitter.ts";
import type { DatasetSplitConfig } from "../server/services/dataset/types.ts";

describe("DatasetSplitter Unit Tests", () => {
  const splitter = new DatasetSplitter();

  // Create 10 products with 3 items each (total 30 items)
  const sampleItems: Array<{ id: string; productId: string; sku: string }> = [];
  for (let p = 1; p <= 10; p++) {
    const prodId = `prod-${p}`;
    const sku = `SKU-${p.toString().padStart(3, "0")}`;
    sampleItems.push({ id: `item-${p}-orig`, productId: prodId, sku });
    sampleItems.push({ id: `item-${p}-aug1`, productId: prodId, sku });
    sampleItems.push({ id: `item-${p}-aug2`, productId: prodId, sku });
  }

  const config: DatasetSplitConfig = {
    trainRatio: 0.7,
    valRatio: 0.15,
    testRatio: 0.15,
    randomSeed: 42,
    includeOriginals: true,
  };

  it("partitions items strictly at the product SKU level with zero leakage", () => {
    const partitioned = splitter.partition(sampleItems, config);

    const trainProductIds = new Set(partitioned.trainItems.map((i) => i.productId));
    const valProductIds = new Set(partitioned.valItems.map((i) => i.productId));
    const testProductIds = new Set(partitioned.testItems.map((i) => i.productId));

    // 1. Verify all 3 items of each product stay together in the same partition
    for (const [prodId, split] of partitioned.productSplitMap.entries()) {
      const itemsOfProd = sampleItems.filter((i) => i.productId === prodId);
      const splitItems =
        split === "train"
          ? partitioned.trainItems
          : split === "val"
          ? partitioned.valItems
          : partitioned.testItems;

      for (const it of itemsOfProd) {
        expect(splitItems.some((s) => s.id === it.id)).toBe(true);
      }
    }

    // 2. Strict Anti-Leakage Assertion: Sets must be mutually disjoint
    for (const id of trainProductIds) {
      expect(valProductIds.has(id)).toBe(false);
      expect(testProductIds.has(id)).toBe(false);
    }
    for (const id of valProductIds) {
      expect(testProductIds.has(id)).toBe(false);
    }

    // 3. Total counts match
    expect(
      partitioned.trainItems.length +
        partitioned.valItems.length +
        partitioned.testItems.length
    ).toBe(30);
  });

  it("produces identical partitions for identical random seed (reproducibility)", () => {
    const run1 = splitter.partition(sampleItems, { ...config, randomSeed: 1234 });
    const run2 = splitter.partition(sampleItems, { ...config, randomSeed: 1234 });

    expect(Array.from(run1.productSplitMap.entries())).toEqual(
      Array.from(run2.productSplitMap.entries())
    );
  });

  it("produces different partitions for different seeds", () => {
    const runA = splitter.partition(sampleItems, { ...config, randomSeed: 111 });
    const runB = splitter.partition(sampleItems, { ...config, randomSeed: 999 });

    const mapA = Array.from(runA.productSplitMap.entries());
    const mapB = Array.from(runB.productSplitMap.entries());

    expect(mapA).not.toEqual(mapB);
  });
});
