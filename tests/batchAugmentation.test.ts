import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "../server/config/unifiedConfig.ts";
import { AugmentationService } from "../server/services/augmentationService.ts";
import type { IComfyUIClient } from "../server/services/comfyui/comfyuiClient.ts";
import type {
  AugmentationProgress,
  ComfySystemStats,
} from "../server/services/comfyui/types.ts";
import { WorkflowRegistry } from "../server/services/comfyui/workflowRegistry.ts";

describe("Batch Augmentation and Comparison Tests (Phase 4)", () => {
  const testDir = path.join(config.storage.uploadRoot, "test_batch_aug");
  let testImagePath: string;
  let testMaskPath: string;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    const imageBuf = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 255, g: 100, b: 50 },
      },
    })
      .png()
      .toBuffer();

    testImagePath = path.join(testDir, "batch_test_prod.png");
    await fs.writeFile(testImagePath, imageBuf);

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

    testMaskPath = path.join(testDir, "batch_test_mask.png");
    await fs.writeFile(testMaskPath, maskBuf);
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("executes batch generation of 2 variants with distinct seeds and foreground compositing", async () => {
    const queuedSeeds: number[] = [];

    const mockComfyUIClient: IComfyUIClient = {
      checkHealth: vi.fn().mockResolvedValue(true),
      getSystemStats: vi.fn().mockResolvedValue(null as ComfySystemStats | null),
      uploadImage: vi.fn().mockResolvedValue("comfy_uploaded.png"),
      queuePrompt: vi.fn().mockImplementation(async (promptGraph: any) => {
        queuedSeeds.push(promptGraph["8"].inputs.seed);
        return `prompt-${Date.now()}-${Math.random()}`;
      }),
      trackExecution: vi
        .fn()
        .mockImplementation(
          async (
            _pId: string,
            _cId: string,
            onProgress?: (p: AugmentationProgress) => void
          ) => {
            onProgress?.({
              jobId: "batch-job",
              promptId: "prompt-xyz",
              progressPercent: 100,
              currentNode: null,
              statusText: "Complete",
            });
            return [{ filename: "gen_variant.png", subfolder: "", type: "output" }];
          }
        ),
      downloadImage: vi.fn().mockImplementation(async () => {
        return sharp({
          create: {
            width: 64,
            height: 64,
            channels: 3,
            background: { r: 0, g: 200, b: 255 },
          },
        })
          .png()
          .toBuffer();
      }),
      cancelExecution: vi.fn().mockResolvedValue(true),
    };

    const mockProductRepo = {
      findByIdAndUserId: vi.fn().mockResolvedValue({
        id: "prod-batch",
        userId: "user-batch",
        name: "Designer Handbag",
        images: [{ id: "asset-batch" }],
      }),
    } as unknown as any;

    const mockAssetRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "asset-batch",
        productId: "prod-batch",
        relativePath: path.relative(config.storage.uploadRoot, testImagePath).replace(/\\/g, "/"),
        maskPath: path.relative(config.storage.uploadRoot, testMaskPath).replace(/\\/g, "/"),
      }),
    } as unknown as any;

    const mockJobRepo = {
      create: vi.fn().mockResolvedValue({
        id: "job-batch-1",
        productId: "prod-batch",
        status: "QUEUED",
      }),
      updateStatus: vi.fn().mockResolvedValue({ id: "job-batch-1", status: "COMPLETED" }),
      updateProgress: vi.fn().mockResolvedValue({ id: "job-batch-1", progress: 50 }),
      findByIdAndUserId: vi.fn().mockResolvedValue({
        id: "job-batch-1",
        status: "COMPLETED",
        results: [],
      }),
    } as unknown as any;

    const createdResults: any[] = [];
    const mockResultRepo = {
      create: vi.fn().mockImplementation(async (data: unknown) => {
        const item = { id: `res-${createdResults.length + 1}`, ...(data as object) };
        createdResults.push(item);
        return item;
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

    const outcome = await service.submitJob("user-batch", {
      productId: "prod-batch",
      workflowId: "wf-02-lighting-shadow",
      numVariants: 2,
      seed: 5000,
      preserveOriginalForeground: true,
      enableEdgeRefinement: true,
    });

    expect(outcome.job).toBeDefined();
    expect(outcome.results).toHaveLength(2);
    expect(queuedSeeds).toHaveLength(2);
    expect(queuedSeeds[0]).toBe(5000);
    expect(queuedSeeds[1]).toBe(5000 + 7919); // Distinct seed offset for variant 2
    expect(createdResults).toHaveLength(2);
    expect(createdResults[0].isComposited).toBe(true);
    expect(createdResults[0].compositionStrategy).toBe("alpha_feathered");
  });

  it("structures product comparison grouped across workflows", async () => {
    const mockProductRepo = {
      findByIdAndUserId: vi.fn().mockResolvedValue({
        id: "prod-compare",
        userId: "user-1",
        name: "Ceramic Mug",
        sku: "MUG-001",
        category: "Kitchen",
        subcategory: "Drinkware",
        images: [{ id: "asset-1", relativePath: "orig.png", maskPath: "mask.png" }],
      }),
    } as unknown as any;

    const mockResultRepo = {
      findByProductId: vi.fn().mockResolvedValue([
        {
          id: "r1",
          workflowId: "wf-01-background-replacement",
          imagePath: "aug1.png",
          thumbnailPath: "thumb1.png",
          reviewDecision: "APPROVED",
          createdAt: new Date(),
        },
        {
          id: "r2",
          workflowId: "wf-02-lighting-shadow",
          imagePath: "aug2.png",
          thumbnailPath: "thumb2.png",
          reviewDecision: "PENDING",
          createdAt: new Date(),
        },
        {
          id: "r3",
          workflowId: "wf-03-lifestyle-scene",
          imagePath: "aug3.png",
          thumbnailPath: "thumb3.png",
          reviewDecision: "REJECTED",
          createdAt: new Date(),
        },
      ]),
    } as unknown as any;

    const service = new AugmentationService(
      {} as any,
      new WorkflowRegistry(),
      {} as any,
      mockResultRepo,
      mockProductRepo,
      {} as any
    );

    const comparison = (await service.compareProductAugmentations(
      "prod-compare",
      "user-1"
    )) as any;

    expect(comparison).toBeDefined();
    expect(comparison.product.name).toBe("Ceramic Mug");
    expect(comparison.totalVariants).toBe(3);
    expect(comparison.reviewStats).toEqual({
      approved: 1,
      rejected: 1,
      needsReview: 0,
      pending: 1,
    });
    expect(comparison.workflows).toHaveLength(3);
  });
});
