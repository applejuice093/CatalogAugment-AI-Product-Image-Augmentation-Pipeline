import type { DatasetSplit, DatasetSplitConfig } from "./types.ts";

export interface SplitProductGroup<T> {
  productId: string;
  sku: string;
  items: T[];
}

export interface PartitionedDataset<T> {
  productSplitMap: Map<string, DatasetSplit>;
  trainItems: T[];
  valItems: T[];
  testItems: T[];
  summary: {
    train: { products: number; items: number };
    val: { products: number; items: number };
    test: { products: number; items: number };
  };
}

export class DatasetSplitter {
  /**
   * Partitions products and their associated images strictly at the SKU/Product level.
   * Guarantees zero data leakage across train, val, and test splits.
   */
  partition<T extends { productId: string; sku: string }>(
    items: T[],
    config: DatasetSplitConfig
  ): PartitionedDataset<T> {
    // 1. Group all items by productId
    const productGroups = new Map<string, T[]>();
    const productSkuMap = new Map<string, string>();

    for (const item of items) {
      if (!productGroups.has(item.productId)) {
        productGroups.set(item.productId, []);
        productSkuMap.set(item.productId, item.sku);
      }
      productGroups.get(item.productId)!.push(item);
    }

    const uniqueProductIds = Array.from(productGroups.keys());

    // 2. Deterministic pseudo-random shuffle using Mulberry32 seeded PRNG
    const rng = this.createMulberry32(config.randomSeed);
    const shuffledProductIds = [...uniqueProductIds];

    for (let i = shuffledProductIds.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledProductIds[i], shuffledProductIds[j]] = [
        shuffledProductIds[j],
        shuffledProductIds[i],
      ];
    }

    // 3. Compute partition boundaries
    const totalProducts = shuffledProductIds.length;
    const trainCount = Math.floor(totalProducts * config.trainRatio);
    const valCount = Math.floor(totalProducts * config.valRatio);

    const trainProductIds = new Set(shuffledProductIds.slice(0, trainCount));
    const valProductIds = new Set(
      shuffledProductIds.slice(trainCount, trainCount + valCount)
    );
    const testProductIds = new Set(shuffledProductIds.slice(trainCount + valCount));

    // Handle edge case where totalProducts is very small (1 or 2 products)
    if (trainProductIds.size === 0 && totalProducts > 0) {
      trainProductIds.add(shuffledProductIds[0]);
      valProductIds.delete(shuffledProductIds[0]);
      testProductIds.delete(shuffledProductIds[0]);
    }

    // 4. ANTI-LEAKAGE INTEGRITY GATE
    this.assertZeroLeakage(trainProductIds, valProductIds, testProductIds);

    const productSplitMap = new Map<string, DatasetSplit>();
    for (const pid of trainProductIds) productSplitMap.set(pid, "train");
    for (const pid of valProductIds) productSplitMap.set(pid, "val");
    for (const pid of testProductIds) productSplitMap.set(pid, "test");

    const trainItems: T[] = [];
    const valItems: T[] = [];
    const testItems: T[] = [];

    for (const item of items) {
      const split = productSplitMap.get(item.productId) ?? "train";
      if (split === "train") trainItems.push(item);
      else if (split === "val") valItems.push(item);
      else testItems.push(item);
    }

    return {
      productSplitMap,
      trainItems,
      valItems,
      testItems,
      summary: {
        train: { products: trainProductIds.size, items: trainItems.length },
        val: { products: valProductIds.size, items: valItems.length },
        test: { products: testProductIds.size, items: testItems.length },
      },
    };
  }

  /**
   * Mathematical verification: asserts train, val, and test product sets are strictly disjoint
   */
  private assertZeroLeakage(
    train: Set<string>,
    val: Set<string>,
    test: Set<string>
  ): void {
    for (const id of train) {
      if (val.has(id)) {
        throw new Error(`Data leakage detected: Product ${id} present in both train and val sets!`);
      }
      if (test.has(id)) {
        throw new Error(`Data leakage detected: Product ${id} present in both train and test sets!`);
      }
    }
    for (const id of val) {
      if (test.has(id)) {
        throw new Error(`Data leakage detected: Product ${id} present in both val and test sets!`);
      }
    }
  }

  /**
   * Mulberry32 32-bit state seeded PRNG
   */
  private createMulberry32(seed: number): () => number {
    let s = Math.floor(seed) >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}

export const defaultDatasetSplitter = new DatasetSplitter();
