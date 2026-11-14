import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "../server/config/unifiedConfig.ts";
import { AugmentationService } from "../server/services/augmentationService.ts";
import type { IComfyUIClient } from "../server/services/comfyui/comfyuiClient.ts";
import type {
  AugmentationProgress,
  ComfyImageOutput,
  ComfyPromptGraph,
  ComfySystemStats,
} from "../server/services/comfyui/types.ts";
import { WorkflowRegistry } from "../server/services/comfyui/workflowRegistry.ts";

describe("AugmentationService Unit Tests", () => {
  const testDir = path.join(config.storage.uploadRoot, "test_aug_service");
  let testImagePath: string;
  let testMaskPath: string;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    // Create small sample image
    const imageBuf = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    testImagePath = path.join(testDir, "test_prod.png");
    await fs.writeFile(testImagePath, imageBuf);

    // Create mask
    const maskBuf = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    testMaskPath = path.join(testDir, "test_mask.png");
    await fs.writeFile(testMaskPath, maskBuf);
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("submits an augmentation job and completes successfully with mock ComfyUI client", async () => {
    const mockComfyUIClient: IComfyUIClient = {
      checkHealth: vi.fn().mockResolvedValue(true),
      getSystemStats: vi.fn().mockResolvedValue(null as ComfySystemStats | null),
      uploadImage: vi.fn().mockResolvedValue("comfy_uploaded.png"),
      queuePrompt: vi.fn().mockResolvedValue("prompt-test-999"),
      trackExecution: vi
        .fn()
        .mockImplementation(
          async (
            _pId: string,
            _cId: string,
            onProgress?: (p: AugmentationProgress) => void
          ) => {
            onProgress?.({
              jobId: "test-job",
              promptId: "prompt-test-999",
              progressPercent: 50,
              currentNode: "KSampler",
              statusText: "Sampling",
            });
            return [{ filename: "aug_out_1.png", subfolder: "", type: "output" }];
          }
        ),
      downloadImage: vi.fn().mockImplementation(async () => {
        return sharp({
          create: {
            width: 64,
            height: 64,
            channels: 4,
            background: { r: 0, g: 255, b: 0, alpha: 1 },
          },
        })
          .png()
          .toBuffer();
      }),
      cancelExecution: vi.fn().mockResolvedValue(true),
    };

    const mockProductRepo = {
      findByIdAndUserId: vi.fn().mockResolvedValue({
        id: "prod-1",
        userId: "user-1",
        name: "Test Watch",
        images: [{ id: "asset-1" }],
      }),
    } as unknown as any;

    const mockAssetRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "asset-1",
        productId: "prod-1",
        relativePath: path.relative(config.storage.uploadRoot, testImagePath).replace(/\\/g, "/"),
        maskPath: path.relative(config.storage.uploadRoot, testMaskPath).replace(/\\/g, "/"),
      }),
    } as unknown as any;

    const mockJobRepo = {
      create: vi.fn().mockResolvedValue({
        id: "job-1",
        productId: "prod-1",
        status: "QUEUED",
      }),
      updateStatus: vi.fn().mockResolvedValue({ id: "job-1", status: "COMPLETED" }),
      updateProgress: vi.fn().mockResolvedValue({ id: "job-1", progress: 50 }),
      findByIdAndUserId: vi.fn().mockResolvedValue({
        id: "job-1",
        status: "COMPLETED",
        results: [],
      }),
    } as unknown as any;

    const mockResultRepo = {
      create: vi.fn().mockImplementation(async (data: unknown) => ({
        id: "result-1",
        ...(data as object),
      })),
      findById: vi.fn().mockResolvedValue({
        id: "result-1",
        reviewDecision: "PENDING",
      }),
      updateReviewDecision: vi.fn().mockResolvedValue({
        id: "result-1",
        reviewDecision: "APPROVED",
      }),
    } as unknown as any;

    const service = new AugmentationService(
      mockComfyUIClient,
      new WorkflowRegistry(),
      mockJobRepo,
      mockResultRepo,
      mockProductRepo,
      mockAssetRepo
    );

    const outcome = await service.submitJob("user-1", {
      productId: "prod-1",
      workflowId: "wf-01-background-replacement",
      prompt: "sleek wooden display",
    });

    expect(outcome.job).toBeDefined();
    expect(outcome.results).toHaveLength(1);
    expect(mockComfyUIClient.uploadImage).toHaveBeenCalledTimes(2);
    expect(mockComfyUIClient.queuePrompt).toHaveBeenCalled();
    expect(mockJobRepo.updateStatus).toHaveBeenCalledWith(
      "job-1",
      "COMPLETED",
      100
    );
  });

  it("fails if target product does not exist", async () => {
    const mockProductRepo = {
      findByIdAndUserId: vi.fn().mockResolvedValue(null),
    } as unknown as any;

    const service = new AugmentationService(
      {} as any,
      new WorkflowRegistry(),
      {} as any,
      {} as any,
      mockProductRepo,
      {} as any
    );

    await expect(
      service.submitJob("user-1", {
        productId: "non-existent",
        workflowId: "wf-01-background-replacement",
      })
    ).rejects.toThrow("Product not found");
  });

  it("records review decisions accurately", async () => {
    const mockResultRepo = {
      findById: vi.fn().mockResolvedValue({ id: "res-100" }),
      updateReviewDecision: vi.fn().mockResolvedValue({
        id: "res-100",
        reviewDecision: "APPROVED",
      }),
    } as unknown as any;

    const service = new AugmentationService(
      {} as any,
      new WorkflowRegistry(),
      {} as any,
      mockResultRepo,
      {} as any,
      {} as any
    );

    const updated = await service.reviewResult("res-100", "APPROVED");
    expect(updated).toEqual({ id: "res-100", reviewDecision: "APPROVED" });
    expect(mockResultRepo.updateReviewDecision).toHaveBeenCalledWith(
      "res-100",
      "APPROVED"
    );
  });
});
