import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "../server/config/unifiedConfig.ts";
import type { AssetRepository } from "../server/repositories/AssetRepository.ts";
import type { AugmentationResultRepository } from "../server/repositories/AugmentationResultRepository.ts";
import type { ProductRepository } from "../server/repositories/ProductRepository.ts";
import type { QualityAssessmentRepository } from "../server/repositories/QualityAssessmentRepository.ts";
import type { VLMAnalysisRepository } from "../server/repositories/VLMAnalysisRepository.ts";
import { QualityAssessmentService } from "../server/services/quality/qualityAssessmentService.ts";
import type { VLMService } from "../server/services/vlm/vlmService.ts";

describe("QualityAssessmentService Unit Tests", () => {
  const testDir = path.join(config.storage.uploadRoot, "test_qc_service");

  const mockProduct = {
    id: "prod-qc-1",
    userId: "user-qc",
    name: "Performance Sneaker",
    sku: "SNK-001",
    category: "Footwear",
    subcategory: "Athletic",
    description: "Breathable mesh sneaker.",
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [{ id: "asset-qc-1", relativePath: "test_qc_service/orig.png" }],
  };

  const mockAsset = {
    id: "asset-qc-1",
    userId: "user-qc",
    productId: "prod-qc-1",
    originalName: "orig.png",
    relativePath: "test_qc_service/orig.png",
    maskPath: "test_qc_service/mask.png",
    mime: "image/png",
    bytes: 2048,
    width: 64,
    height: 64,
    format: "png",
    foregroundPath: null,
    segmentationModel: null,
    segmentationVersion: null,
    segmentationStatus: "COMPLETED",
    createdAt: new Date(),
  };

  const mockAugResult = {
    id: "aug-res-qc-1",
    jobId: "job-qc-1",
    productId: "prod-qc-1",
    originalAssetId: "asset-qc-1",
    imagePath: "test_qc_service/aug.png",
    reviewDecision: "PENDING",
    createdAt: new Date(),
  };

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    const svg = Buffer.from(
      `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#444444" />
        <rect x="20" y="20" width="88" height="88" fill="#dddddd" />
        <line x1="0" y1="0" x2="128" y2="128" stroke="#111111" stroke-width="4" />
        <line x1="128" y1="0" x2="0" y2="128" stroke="#111111" stroke-width="4" />
      </svg>`
    );
    const imgBuf = await sharp(svg).png().toBuffer();

    await fs.writeFile(path.join(testDir, "orig.png"), imgBuf);
    await fs.writeFile(path.join(testDir, "aug.png"), imgBuf);

    const maskBuf = await sharp({
      create: { width: 128, height: 128, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .png()
      .toBuffer();
    await fs.writeFile(path.join(testDir, "mask.png"), maskBuf);
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("assessResult computes scores and stores quality assessment record", async () => {
    const mockResultRepo = {
      findById: vi.fn().mockResolvedValue(mockAugResult),
      updateReview: vi.fn().mockResolvedValue(mockAugResult),
    } as unknown as AugmentationResultRepository;

    const mockProductRepo = {
      findByIdAndUserId: vi.fn().mockResolvedValue(mockProduct),
    } as unknown as ProductRepository;

    const mockAssetRepo = {
      findById: vi.fn().mockResolvedValue(mockAsset),
    } as unknown as AssetRepository;

    const createdAssessments: unknown[] = [];
    const mockQualityRepo = {
      findByResultId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => {
        createdAssessments.push(data);
        return Promise.resolve({ id: "qa-1", ...data });
      }),
      updateReview: vi.fn(),
    } as unknown as QualityAssessmentRepository;

    const mockVlmRepo = {
      findByResultId: vi.fn().mockResolvedValue([
        {
          normalizedData: {
            identityPreservationScore: 95,
            reviewRecommendation: "APPROVED",
            assessmentNotes: "Matches authentic product.",
          },
        },
      ]),
    } as unknown as VLMAnalysisRepository;

    const mockVlmService = {} as VLMService;

    const service = new QualityAssessmentService(
      mockResultRepo,
      mockProductRepo,
      mockAssetRepo,
      mockQualityRepo,
      mockVlmRepo,
      mockVlmService
    );

    const result = await service.assessResult("aug-res-qc-1", "user-qc", true);

    expect(result.decision).toBe("PASS");
    expect(result.compositeScore).toBeGreaterThanOrEqual(80);
    expect(result.foregroundPreservationScore).toBe(100);
    expect(mockQualityRepo.create).toHaveBeenCalledTimes(1);
    expect(mockResultRepo.updateReview).toHaveBeenCalledWith("aug-res-qc-1", {
      reviewDecision: "APPROVED",
    });
  });

  it("submitManualReview updates assessment and logs human audit trail", async () => {
    const mockResultRepo = {
      findById: vi.fn().mockResolvedValue(mockAugResult),
      updateReview: vi.fn().mockResolvedValue(mockAugResult),
    } as unknown as AugmentationResultRepository;

    const mockProductRepo = {
      findByIdAndUserId: vi.fn().mockResolvedValue(mockProduct),
    } as unknown as ProductRepository;

    const mockQualityRepo = {
      findByResultId: vi.fn().mockResolvedValue({ id: "qa-1", decision: "NEEDS_REVIEW" }),
      updateReview: vi.fn().mockResolvedValue({ id: "qa-1", decision: "PASS" }),
    } as unknown as QualityAssessmentRepository;

    const service = new QualityAssessmentService(
      mockResultRepo,
      mockProductRepo,
      {} as AssetRepository,
      mockQualityRepo,
      {} as VLMAnalysisRepository,
      {} as VLMService
    );

    const reviewRes = await service.submitManualReview("aug-res-qc-1", "user-qc", {
      decision: "PASS",
      reviewNotes: "Verified shadows manually. Approved.",
    });

    expect(reviewRes.success).toBe(true);
    expect(reviewRes.decision).toBe("PASS");
    expect(mockQualityRepo.updateReview).toHaveBeenCalledWith("qa-1", {
      decision: "PASS",
      reviewerId: "user-qc",
      reviewNotes: "Verified shadows manually. Approved.",
      rejectionReason: undefined,
    });
    expect(mockResultRepo.updateReview).toHaveBeenCalledWith("aug-res-qc-1", {
      reviewDecision: "APPROVED",
      reviewNotes: "Verified shadows manually. Approved.",
      reviewedBy: "user-qc",
    });
  });
});
