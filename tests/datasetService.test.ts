import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import type { AugmentationResultRepository } from "../server/repositories/AugmentationResultRepository.ts";
import type { DatasetRepository } from "../server/repositories/DatasetRepository.ts";
import type { ProductRepository } from "../server/repositories/ProductRepository.ts";
import type { QualityAssessmentRepository } from "../server/repositories/QualityAssessmentRepository.ts";
import { DatasetService } from "../server/services/dataset/datasetService.ts";

describe("DatasetService Unit Tests", () => {
  const mockProducts = [
    {
      id: "prod-1",
      userId: "user-1",
      name: "Runner One",
      sku: "RUN-01",
      images: [{ id: "asset-1", relativePath: "prod-1/orig.png" }],
    },
    {
      id: "prod-2",
      userId: "user-1",
      name: "Runner Two",
      sku: "RUN-02",
      images: [{ id: "asset-2", relativePath: "prod-2/orig.png" }],
    },
  ];

  const mockVariants = [
    {
      id: "aug-1",
      productId: "prod-1",
      originalAssetId: "asset-1",
      imagePath: "prod-1/aug-1.png",
      workflowId: "wf-01",
      workflowVersion: "1.0",
      prompt: "studio lights",
      seed: 42n,
      reviewDecision: "APPROVED",
    },
  ];

  it("createDataset aggregates items, executes SKU partitioning, and persists dataset", async () => {
    const createdDataset = {
      id: "ds-created-1",
      userId: "user-1",
      name: "Q4 Dataset",
      version: "1.0.0",
      description: "Test run",
      splitConfig: { trainRatio: 0.7, valRatio: 0.15, testRatio: 0.15 },
      totalProducts: 2,
      totalImages: 3,
      status: "READY",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDatasetRepo = {
      create: vi.fn().mockResolvedValue(createdDataset),
      createItems: vi.fn().mockResolvedValue({ count: 3 }),
    } as unknown as DatasetRepository;

    const mockProductRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockProducts),
    } as unknown as ProductRepository;

    const mockAugRepo = {
      findByProductId: vi.fn().mockImplementation((prodId: string) => {
        if (prodId === "prod-1") return Promise.resolve(mockVariants);
        return Promise.resolve([]);
      }),
    } as unknown as AugmentationResultRepository;

    const mockQualityRepo = {
      findByResultId: vi.fn().mockResolvedValue({
        compositeScore: 92,
        decision: "PASS",
      }),
    } as unknown as QualityAssessmentRepository;

    const service = new DatasetService(
      mockDatasetRepo,
      mockProductRepo,
      mockAugRepo,
      mockQualityRepo
    );

    const result = await service.createDataset("user-1", {
      name: "Q4 Dataset",
      description: "Test run",
    });

    expect(result.dataset.id).toBe("ds-created-1");
    expect(mockDatasetRepo.create).toHaveBeenCalledTimes(1);
    expect(mockDatasetRepo.createItems).toHaveBeenCalledTimes(1);
  });

  it("getDatasetManifest compiles split breakdown and records list", async () => {
    const mockDataset = {
      id: "ds-1",
      userId: "user-1",
      name: "Test Dataset",
      version: "1.0.0",
      splitConfig: { trainRatio: 0.7, valRatio: 0.15, testRatio: 0.15 },
      totalProducts: 1,
      totalImages: 1,
    };

    const mockItems = [
      {
        id: "item-1",
        datasetId: "ds-1",
        productId: "prod-1",
        sku: "RUN-01",
        split: "train",
        imagePath: "prod-1/orig.png",
        isOriginal: true,
        metadata: {
          productId: "prod-1",
          sku: "RUN-01",
          productName: "Runner One",
          isOriginal: true,
        },
        product: { name: "Runner One" },
      },
    ];

    const mockDatasetRepo = {
      findById: vi.fn().mockResolvedValue(mockDataset),
      findItemsByDatasetId: vi.fn().mockResolvedValue(mockItems),
    } as unknown as DatasetRepository;

    const service = new DatasetService(
      mockDatasetRepo,
      {} as ProductRepository,
      {} as AugmentationResultRepository,
      {} as QualityAssessmentRepository
    );

    const manifest = await service.getDatasetManifest("ds-1", "user-1");

    expect(manifest.datasetId).toBe("ds-1");
    expect(manifest.totalImages).toBe(1);
    expect(manifest.records[0].sku).toBe("RUN-01");
    expect(manifest.splitBreakdown.train.images).toBe(1);
  });
});
