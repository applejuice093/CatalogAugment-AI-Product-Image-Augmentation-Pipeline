import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "../server/config/unifiedConfig.ts";
import type { AugmentationResultRepository } from "../server/repositories/AugmentationResultRepository.ts";
import type { DatasetRepository } from "../server/repositories/DatasetRepository.ts";
import type { EvaluationRunRepository } from "../server/repositories/EvaluationRunRepository.ts";
import type { ProductRepository } from "../server/repositories/ProductRepository.ts";
import { EvaluationBenchmarkService } from "../server/services/evaluation/evaluationBenchmarkService.ts";

describe("EvaluationBenchmarkService Unit Tests", () => {
  const testDir = path.join(config.storage.uploadRoot, "test_eval_service");

  const mockProducts = [
    {
      id: "prod-eval-1",
      userId: "user-eval",
      name: "Chrono Watch",
      sku: "WATCH-01",
      images: [{ id: "asset-1", relativePath: "test_eval_service/watch.png" }],
    },
    {
      id: "prod-eval-2",
      userId: "user-eval",
      name: "Leather Bag",
      sku: "BAG-01",
      images: [{ id: "asset-2", relativePath: "test_eval_service/bag.png" }],
    },
  ];

  const mockVariants = [
    {
      id: "aug-var-1",
      productId: "prod-eval-1",
      imagePath: "test_eval_service/watch_aug.png",
      workflowId: "wf-01",
      reviewDecision: "APPROVED",
    },
  ];

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    // Create 2 visually distinct product photos
    const watchBuf = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 220, g: 30, b: 30 } },
    })
      .png()
      .toBuffer();
    await fs.writeFile(path.join(testDir, "watch.png"), watchBuf);
    await fs.writeFile(path.join(testDir, "watch_aug.png"), watchBuf);

    const bagBuf = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 30, g: 30, b: 220 } },
    })
      .png()
      .toBuffer();
    await fs.writeFile(path.join(testDir, "bag.png"), bagBuf);
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("runBenchmark executes 4 comparative experiments and outputs performance gains", async () => {
    const createdDbRun = {
      id: "eval-db-1",
      userId: "user-eval",
      name: "Q4 Retrieval Benchmark",
      encoderName: "feature-tensor-512",
      encoderDimension: 512,
      status: "COMPLETED",
      metrics: {},
      config: {},
      summary: "Done",
      durationMs: 150,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    const mockEvalRepo = {
      create: vi.fn().mockResolvedValue(createdDbRun),
      findById: vi.fn(),
      findByUserId: vi.fn(),
    } as unknown as EvaluationRunRepository;

    const mockProductRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockProducts),
    } as unknown as ProductRepository;

    const mockAugRepo = {
      findByProductId: vi.fn().mockImplementation((prodId: string) => {
        if (prodId === "prod-eval-1") return Promise.resolve(mockVariants);
        return Promise.resolve([]);
      }),
    } as unknown as AugmentationResultRepository;

    const service = new EvaluationBenchmarkService(
      mockEvalRepo,
      mockProductRepo,
      mockAugRepo,
      {} as DatasetRepository
    );

    const report = await service.runBenchmark("user-eval", {
      name: "Q4 Retrieval Benchmark",
      topK: 5,
    });

    expect(report.id).toBe("eval-db-1");
    expect(report.experiments.EXPERIMENT_A).toBeDefined();
    expect(report.experiments.EXPERIMENT_B).toBeDefined();
    expect(report.experiments.EXPERIMENT_C).toBeDefined();
    expect(report.experiments.EXPERIMENT_D).toBeDefined();
    expect(report.experiments.EXPERIMENT_A.metrics.queryCount).toBe(2);
    expect(report.relativeGains).toHaveProperty("generativeOverBaseline");
    expect(report.relativeGains).toHaveProperty("combinedOverBaseline");
    expect(mockEvalRepo.create).toHaveBeenCalledTimes(1);
  });

  it("searchCatalog retrieves closest products for visual search query", async () => {
    const mockProductRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockProducts),
    } as unknown as ProductRepository;

    const service = new EvaluationBenchmarkService(
      {} as EvaluationRunRepository,
      mockProductRepo,
      {} as AugmentationResultRepository,
      {} as DatasetRepository
    );

    const queryBuf = await fs.readFile(path.join(testDir, "watch.png"));
    const matches = await service.searchCatalog("user-eval", queryBuf, 2);

    expect(matches).toHaveLength(2);
    expect(matches[0].productId).toBe("prod-eval-1");
    expect(matches[0].similarityScore).toBeCloseTo(1.0, 2);
  });
});
