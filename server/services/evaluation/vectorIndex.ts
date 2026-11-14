import type { IndexedCatalogItem, SearchResult } from "./types.ts";

export class VectorIndex {
  private items: IndexedCatalogItem[] = [];

  add(item: IndexedCatalogItem): void {
    this.items.push(item);
  }

  addAll(items: IndexedCatalogItem[]): void {
    this.items.push(...items);
  }

  clear(): void {
    this.items = [];
  }

  size(): number {
    return this.items.length;
  }

  getItems(): IndexedCatalogItem[] {
    return this.items;
  }

  /**
   * Performs nearest-neighbor cosine similarity search
   */
  search(
    queryEmbedding: number[],
    topK = 5,
    filter?: (item: IndexedCatalogItem) => boolean
  ): SearchResult[] {
    const candidates = filter ? this.items.filter(filter) : this.items;
    const scored: Array<{ item: IndexedCatalogItem; score: number }> = [];

    const dim = queryEmbedding.length;

    for (const item of candidates) {
      // Dot product of L2-normalized vectors = cosine similarity
      let dot = 0;
      const targetVec = item.embedding;
      for (let i = 0; i < dim; i++) {
        dot += queryEmbedding[i] * targetVec[i];
      }

      scored.push({
        item,
        score: Number(dot.toFixed(4)),
      });
    }

    // Sort descending by similarity score
    scored.sort((a, b) => b.score - a.score);

    const topResults = scored.slice(0, topK);

    return topResults.map(({ item, score }) => ({
      productId: item.productId,
      sku: item.sku,
      itemId: item.id,
      imagePath: item.imagePath,
      similarityScore: score,
      isAugmented: item.isAugmented,
      augmentationType: item.augmentationType,
    }));
  }
}
