import type { AugmentationResult } from "@prisma/client";
import { prisma } from "../db/prisma.ts";

export interface CreateAugmentationResultInput {
  jobId?: string;
  productId: string;
  originalAssetId?: string;
  imagePath: string;
  thumbnailPath?: string;
  comfyFilename?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: bigint | number;
  cfg?: number;
  steps?: number;
  denoise?: number;
  sampler?: string;
  workflowId: string;
  workflowVersion: string;
  status?: string;
  reviewDecision?: string;
}

export class AugmentationResultRepository {
  async findById(id: string): Promise<AugmentationResult | null> {
    return prisma.augmentationResult.findUnique({
      where: { id },
      include: {
        job: true,
      },
    });
  }

  async findByJobId(jobId: string): Promise<AugmentationResult[]> {
    return prisma.augmentationResult.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByProductId(productId: string): Promise<AugmentationResult[]> {
    return prisma.augmentationResult.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: CreateAugmentationResultInput): Promise<AugmentationResult> {
    return prisma.augmentationResult.create({
      data: {
        jobId: data.jobId,
        productId: data.productId,
        originalAssetId: data.originalAssetId,
        imagePath: data.imagePath,
        thumbnailPath: data.thumbnailPath,
        comfyFilename: data.comfyFilename,
        prompt: data.prompt,
        negativePrompt: data.negativePrompt,
        seed: data.seed !== undefined ? BigInt(data.seed) : undefined,
        cfg: data.cfg,
        steps: data.steps,
        denoise: data.denoise,
        sampler: data.sampler,
        workflowId: data.workflowId,
        workflowVersion: data.workflowVersion,
        status: data.status ?? "COMPLETED",
        reviewDecision: data.reviewDecision ?? "PENDING",
      },
    });
  }

  async updateReviewDecision(
    id: string,
    decision: "APPROVED" | "REJECTED" | "NEEDS_REVIEW" | "PENDING"
  ): Promise<AugmentationResult> {
    return prisma.augmentationResult.update({
      where: { id },
      data: {
        reviewDecision: decision,
      },
    });
  }
}
