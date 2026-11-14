import { prisma } from "../db/prisma.ts";
import type { Prisma } from "@prisma/client";

export class DatasetRepository {
  async create(data: {
    userId: string;
    name: string;
    version?: string;
    description?: string;
    splitConfig: Record<string, unknown>;
    totalProducts: number;
    totalImages: number;
  }) {
    return prisma.dataset.create({
      data: {
        userId: data.userId,
        name: data.name,
        version: data.version || "1.0.0",
        description: data.description,
        splitConfig: data.splitConfig as Prisma.InputJsonValue,
        totalProducts: data.totalProducts,
        totalImages: data.totalImages,
        status: "READY",
      },
    });
  }

  async createItems(
    items: Array<{
      datasetId: string;
      productId: string;
      sku: string;
      split: string;
      augmentationResultId?: string | null;
      imagePath: string;
      isOriginal: boolean;
      metadata?: Record<string, unknown>;
    }>
  ) {
    return prisma.datasetItem.createMany({
      data: items.map((item) => ({
        datasetId: item.datasetId,
        productId: item.productId,
        sku: item.sku,
        split: item.split,
        augmentationResultId: item.augmentationResultId,
        imagePath: item.imagePath,
        isOriginal: item.isOriginal,
        metadata: item.metadata as Prisma.InputJsonValue,
      })),
    });
  }

  async findById(id: string, userId?: string) {
    return prisma.dataset.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
      include: {
        items: true,
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.dataset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findItemsByDatasetId(datasetId: string) {
    return prisma.datasetItem.findMany({
      where: { datasetId },
      include: {
        product: true,
        augmentationResult: true,
      },
      orderBy: [{ split: "asc" }, { sku: "asc" }],
    });
  }

  async delete(id: string, userId: string) {
    return prisma.dataset.deleteMany({
      where: { id, userId },
    });
  }
}
