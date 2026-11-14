import { describe, expect, it } from "vitest";
import type { IndexedCatalogItem } from "../server/services/evaluation/types.ts";
import { VectorIndex } from "../server/services/evaluation/vectorIndex.ts";

describe("VectorIndex Unit Tests", () => {
  it("indexes items and accurately ranks candidate vectors by cosine similarity", () => {
    const index = new VectorIndex();

    // Create 3 simple 4-dimensional unit vectors
    const item1: IndexedCatalogItem = {
      id: "item-1",
      productId: "prod-shoe",
      sku: "SHOE-001",
      imagePath: "shoe.png",
      isAugmented: false,
      augmentationType: "original",
      embedding: [1, 0, 0, 0],
    };

    const item2: IndexedCatalogItem = {
      id: "item-2",
      productId: "prod-shirt",
      sku: "SHIRT-001",
      imagePath: "shirt.png",
      isAugmented: false,
      augmentationType: "original",
      embedding: [0, 1, 0, 0],
    };

    const item3: IndexedCatalogItem = {
      id: "item-3",
      productId: "prod-hat",
      sku: "HAT-001",
      imagePath: "hat.png",
      isAugmented: false,
      augmentationType: "original",
      embedding: [0.7071, 0.7071, 0, 0],
    };

    index.addAll([item1, item2, item3]);
    expect(index.size()).toBe(3);

    // Query close to item 1
    const query = [0.95, 0.05, 0, 0];
    const results = index.search(query, 2);

    expect(results).toHaveLength(2);
    expect(results[0].productId).toBe("prod-shoe");
    expect(results[0].similarityScore).toBeCloseTo(0.95, 2);
    expect(results[1].productId).toBe("prod-hat");
  });
});
