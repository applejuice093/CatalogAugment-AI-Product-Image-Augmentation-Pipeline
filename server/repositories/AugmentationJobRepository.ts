import type { AugmentationJob, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.ts";

export interface CreateAugmentationJobInput {
  productId: string;
  userId?: string;
  inputAssetId?: string;
  workflowId: string;
  workflowVersion: string;
  configJson?: Record<string, unknown>;
}

export class AugmentationJobRepository {
  async findById(id: string): Promise<(AugmentationJob & { results?: unknown[] }) | null> {
    return prisma.augmentationJob.findUnique({
      where: { id },
      include: {
        product: true,
        results: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string
  ): Promise<(AugmentationJob & { results?: unknown[] }) | null> {
    return prisma.augmentationJob.findFirst({
      where: {
        id,
        OR: [{ userId }, { product: { userId } }],
      },
      include: {
        product: true,
        results: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async findByProductId(
    productId: string,
    userId?: string
  ): Promise<AugmentationJob[]> {
    return prisma.augmentationJob.findMany({
      where: {
        productId,
        ...(userId ? { OR: [{ userId }, { product: { userId } }] } : {}),
      },
      include: {
        results: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: CreateAugmentationJobInput): Promise<AugmentationJob> {
    return prisma.augmentationJob.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        inputAssetId: data.inputAssetId,
        workflowId: data.workflowId,
        workflowVersion: data.workflowVersion,
        configJson: (data.configJson ?? {}) as Prisma.InputJsonValue,
        status: "QUEUED",
        progress: 0,
      },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    progress?: number,
    errorMessage?: string,
    promptId?: string
  ): Promise<AugmentationJob> {
    const isCompleted = status === "COMPLETED";
    const isFailed = status === "FAILED";

    return prisma.augmentationJob.update({
      where: { id },
      data: {
        status,
        ...(progress !== undefined ? { progress } : {}),
        ...(errorMessage !== undefined ? { errorMessage } : {}),
        ...(promptId ? { promptId } : {}),
        ...(isCompleted ? { completedAt: new Date(), progress: 100 } : {}),
        ...(isFailed ? { completedAt: new Date() } : {}),
        ...(status === "PROCESSING" ? { startedAt: new Date() } : {}),
      },
    });
  }

  async updateProgress(id: string, progress: number): Promise<AugmentationJob> {
    return prisma.augmentationJob.update({
      where: { id },
      data: {
        progress,
        status: progress > 0 && progress < 100 ? "PROCESSING" : undefined,
      },
    });
  }
}
