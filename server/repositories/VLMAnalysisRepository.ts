import type { Prisma, VLMAnalysis } from "@prisma/client";
import { prisma } from "../db/prisma.ts";

export interface CreateVLMAnalysisInput {
  productId: string;
  augmentationResultId?: string;
  taskType: string;
  provider: string;
  modelName: string;
  promptVersion?: string;
  rawOutput?: string;
  normalizedData: Record<string, unknown>;
  isConsistent?: boolean;
  confidence?: number;
  latencyMs?: number;
}

export class VLMAnalysisRepository {
  async findById(id: string): Promise<VLMAnalysis | null> {
    return prisma.vLMAnalysis.findUnique({
      where: { id },
      include: {
        product: true,
        augmentationResult: true,
      },
    });
  }

  async findByProductId(productId: string): Promise<VLMAnalysis[]> {
    return prisma.vLMAnalysis.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByResultId(augmentationResultId: string): Promise<VLMAnalysis[]> {
    return prisma.vLMAnalysis.findMany({
      where: { augmentationResultId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: CreateVLMAnalysisInput): Promise<VLMAnalysis> {
    return prisma.vLMAnalysis.create({
      data: {
        productId: data.productId,
        augmentationResultId: data.augmentationResultId,
        taskType: data.taskType,
        provider: data.provider,
        modelName: data.modelName,
        promptVersion: data.promptVersion ?? "1.0.0",
        rawOutput: data.rawOutput,
        normalizedData: data.normalizedData as Prisma.InputJsonValue,
        isConsistent: data.isConsistent,
        confidence: data.confidence,
        latencyMs: data.latencyMs,
      },
    });
  }
}
