import { describe, expect, it, vi } from "vitest";
import { EvaluationController } from "../server/controllers/EvaluationController.ts";
import type { EvaluationBenchmarkService } from "../server/services/evaluation/evaluationBenchmarkService.ts";
import { prisma } from "../server/db/prisma.ts";

describe("EvaluationController Unit Tests", () => {
  it("searchCatalog enriches search results with rank, score, product name and metrics", async () => {
    const mockEvalService = {
      searchCatalog: vi.fn().mockResolvedValue([
        {
          productId: "6f529837-3a19-4727-a094-a5c809c2d1af",
          sku: "SHIRT-001",
          itemId: "search-1",
          imagePath: "uploads/shirt.jpg",
          similarityScore: 0.9542,
          isAugmented: false,
          augmentationType: "original",
        },
      ]),
    } as unknown as EvaluationBenchmarkService;

    const controller = new EvaluationController(mockEvalService);

    let statusCode = 0;
    let jsonBody: any = null;

    const res = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((data: any) => {
        jsonBody = data;
        return res;
      }),
    } as any;

    const req = {
      user: { id: "oSkwNwcqtXuHulTox36yRDOki3zBRUv7" },
      file: { buffer: Buffer.from("fake-image-bytes") },
      body: { topK: 3 },
    } as any;

    await controller.searchCatalog(req, res);

    expect(statusCode).toBe(200);
    expect(jsonBody).toBeDefined();
    expect(jsonBody.results).toHaveLength(1);

    const first = jsonBody.results[0];
    expect(first.rank).toBe(1);
    expect(first.score).toBe(0.9542);
    expect(first.name).toBe("BLUE SHIRT");
    expect(first.sku).toBe("SHIRT-001");
    expect(jsonBody.queryMetrics.topK).toBe(3);
    expect(typeof jsonBody.queryMetrics.latencyMs).toBe("number");
  });
});
