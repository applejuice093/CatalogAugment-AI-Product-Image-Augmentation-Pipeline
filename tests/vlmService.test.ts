import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "../server/config/unifiedConfig.ts";
import type { AssetRepository } from "../server/repositories/AssetRepository.ts";
import type { AugmentationResultRepository } from "../server/repositories/AugmentationResultRepository.ts";
import type { ProductRepository } from "../server/repositories/ProductRepository.ts";
import type { VLMAnalysisRepository } from "../server/repositories/VLMAnalysisRepository.ts";
import type {
  ImageConsistencyOutput,
  ProductAnalysisOutput,
  VLMExecutionResult,
} from "../server/services/vlm/types.ts";
import type { VLMOrchestrator } from "../server/services/vlm/vlmOrchestrator.ts";
import { VLMService } from "../server/services/vlm/vlmService.ts";

describe("VLMService Unit Tests", () => {
  const testDir = path.join(config.storage.uploadRoot, "test_vlm_service");
  let testImagePath: string;
  let testAugPath: string;

  const mockProduct = {
    id: "prod-vlm-1",
    userId: "user-vlm",
    name: "Aero Running Shoe",
    sku: "AERO-001",
    category: "",
    subcategory: "",
    description: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [
      {
        id: "asset-vlm-1",
        relativePath: "test_vlm_service/original.png",
      },
    ],
  };

  const mockAsset = {
    id: "asset-vlm-1",
    userId: "user-vlm",
    productId: "prod-vlm-1",
    originalName: "original.png",
    relativePath: "test_vlm_service/original.png",
    mime: "image/png",
    bytes: 2048,
    width: 64,
    height: 64,
    format: "png",
    maskPath: null,
    foregroundPath: null,
    segmentationModel: null,
    segmentationVersion: null,
    segmentationStatus: "COMPLETED",
    createdAt: new Date(),
  };

  const mockAugResult = {
    id: "aug-res-1",
    jobId: "job-1",
    productId: "prod-vlm-1",
    originalAssetId: "asset-vlm-1",
    seed: 42,
    imagePath: "test_vlm_service/augmented.png",
    promptUsed: "modern minimalist studio setting",
    format: "png",
    mimeType: "image/png",
    width: 64,
    height: 64,
    sizeBytes: 2048,
    generationParams: {},
    compositeMetadata: null,
    reviewDecision: "NEEDS_REVIEW",
    reviewNotes: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date(),
  };

  const mockAnalysisOutput: ProductAnalysisOutput = {
    category: "Footwear",
    subcategory: "Athletic Running Shoes",
    dominantColors: ["#111111", "#FFFFFF"],
    identifiableMaterials: ["Mesh", "Synthetic Polymer"],
    distinctiveAttributes: ["Cushioned foam midsole", "Breathable mesh"],
    description: "High performance lightweight athletic footwear.",
    searchTags: ["running", "footwear", "sneaker"],
    uncertainAttributes: ["Water resistance unconfirmed"],
    confidence: 0.94,
  };

  const mockConsistencyOutput: ImageConsistencyOutput = {
    isSameProduct: true,
    identityPreservationScore: 94,
    colorPreservation: "Color tones correspond accurately to the original item.",
    shapePreservation: "Sole curvature and upper shape match precisely.",
    designPreservation: "Original branding and eyelet placement preserved.",
    visibleArtifacts: [],
    reviewRecommendation: "APPROVED",
    assessmentNotes: "Clean high-fidelity variant generation.",
  };

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    const buf1 = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 50, g: 50, b: 50 } },
    })
      .png()
      .toBuffer();

    testImagePath = path.join(testDir, "original.png");
    await fs.writeFile(testImagePath, buf1);

    const buf2 = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 60, g: 60, b: 60 } },
    })
      .png()
      .toBuffer();

    testAugPath = path.join(testDir, "augmented.png");
    await fs.writeFile(testAugPath, buf2);
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("analyzeProduct executes analysis, persists to DB, and enriches missing product metadata", async () => {
    const mockProductRepo: ProductRepository = {
      findById: vi.fn().mockResolvedValue(mockProduct),
      findByIdAndUserId: vi.fn().mockResolvedValue(mockProduct),
      findByUserId: vi.fn().mockResolvedValue([mockProduct]),
      findBySku: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({
        ...mockProduct,
        category: "Footwear",
        subcategory: "Athletic Running Shoes",
        description: "High performance lightweight athletic footwear.",
      }),
      delete: vi.fn(),
    };

    const mockAssetRepo: AssetRepository = {
      findById: vi.fn().mockResolvedValue(mockAsset),
      findByIdAndUserId: vi.fn().mockResolvedValue(mockAsset),
      findByProductIdAndUserId: vi.fn().mockResolvedValue([mockAsset]),
      findByUserId: vi.fn().mockResolvedValue([mockAsset]),
      create: vi.fn(),
      delete: vi.fn(),
    };

    const mockResultRepo: AugmentationResultRepository = {
      findById: vi.fn().mockResolvedValue(mockAugResult),
      findByJobId: vi.fn(),
      findByProductId: vi.fn(),
      create: vi.fn(),
      updateReview: vi.fn(),
      delete: vi.fn(),
    };

    const createdRecords: unknown[] = [];
    const mockVlmRepo: VLMAnalysisRepository = {
      create: vi.fn().mockImplementation((data) => {
        createdRecords.push(data);
        return Promise.resolve({ id: "vlm-rec-1", ...data });
      }),
      findById: vi.fn(),
      findByProductId: vi.fn().mockResolvedValue([]),
      findByResultId: vi.fn().mockResolvedValue([]),
    };

    const mockOrchestrator = {
      analyzeProduct: vi.fn().mockResolvedValue({
        taskType: "PRODUCT_ANALYSIS",
        provider: "ollama",
        modelName: "moondream",
        promptVersion: "1.0.0",
        data: mockAnalysisOutput,
        latencyMs: 140,
        confidence: 0.94,
      } as VLMExecutionResult<ProductAnalysisOutput>),
      compareConsistency: vi.fn(),
      getRegisteredProviders: vi.fn().mockReturnValue([{ name: "ollama", modelName: "moondream" }]),
      resolveProvider: vi.fn().mockResolvedValue({
        checkHealth: vi.fn().mockResolvedValue(true),
      }),
    } as unknown as VLMOrchestrator;

    const service = new VLMService(
      mockOrchestrator,
      mockProductRepo,
      mockAssetRepo,
      mockResultRepo,
      mockVlmRepo
    );

    const result = await service.analyzeProduct("prod-vlm-1", "user-vlm");

    expect(result.data.category).toBe("Footwear");
    expect(result.data.confidence).toBe(0.94);
    expect(mockVlmRepo.create).toHaveBeenCalledTimes(1);
    expect(mockProductRepo.update).toHaveBeenCalledWith("prod-vlm-1", "user-vlm", {
      category: "Footwear",
      subcategory: "Athletic Running Shoes",
      description: "High performance lightweight athletic footwear.",
    });
  });

  it("compareAugmentationVariant computes consistency and stores record", async () => {
    const mockProductRepo: ProductRepository = {
      findById: vi.fn().mockResolvedValue(mockProduct),
      findByIdAndUserId: vi.fn().mockResolvedValue(mockProduct),
      findByUserId: vi.fn(),
      findBySku: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const mockAssetRepo: AssetRepository = {
      findById: vi.fn().mockResolvedValue(mockAsset),
      findByIdAndUserId: vi.fn().mockResolvedValue(mockAsset),
      findByProductIdAndUserId: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    };

    const mockResultRepo: AugmentationResultRepository = {
      findById: vi.fn().mockResolvedValue(mockAugResult),
      findByJobId: vi.fn(),
      findByProductId: vi.fn(),
      create: vi.fn(),
      updateReview: vi.fn(),
      delete: vi.fn(),
    };

    const mockVlmRepo: VLMAnalysisRepository = {
      create: vi.fn().mockResolvedValue({ id: "vlm-rec-2" }),
      findById: vi.fn(),
      findByProductId: vi.fn(),
      findByResultId: vi.fn(),
    };

    const mockOrchestrator = {
      analyzeProduct: vi.fn(),
      compareConsistency: vi.fn().mockResolvedValue({
        taskType: "IMAGE_CONSISTENCY",
        provider: "ollama",
        modelName: "moondream",
        promptVersion: "1.0.0",
        data: mockConsistencyOutput,
        latencyMs: 180,
        isConsistent: true,
        confidence: 0.94,
      } as VLMExecutionResult<ImageConsistencyOutput>),
      getRegisteredProviders: vi.fn(),
      resolveProvider: vi.fn(),
    } as unknown as VLMOrchestrator;

    const service = new VLMService(
      mockOrchestrator,
      mockProductRepo,
      mockAssetRepo,
      mockResultRepo,
      mockVlmRepo
    );

    const result = await service.compareAugmentationVariant("aug-res-1", "user-vlm");

    expect(result.data.identityPreservationScore).toBe(94);
    expect(result.data.reviewRecommendation).toBe("APPROVED");
    expect(result.isConsistent).toBe(true);
    expect(mockVlmRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod-vlm-1",
        augmentationResultId: "aug-res-1",
        taskType: "IMAGE_CONSISTENCY",
        isConsistent: true,
      })
    );
  });
});
