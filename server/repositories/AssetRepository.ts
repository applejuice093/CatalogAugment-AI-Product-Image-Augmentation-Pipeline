import type { Asset } from "@prisma/client";
import { prisma } from "../db/prisma.ts";

export interface CreateAssetInput {
  id: string;
  userId: string;
  productId?: string;
  originalName: string;
  relativePath: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
  maskPath?: string;
  foregroundPath?: string;
  segmentationModel?: string;
  segmentationVersion?: string;
  segmentationStatus?: string;
}

export class AssetRepository {
  async findByUserId(userId: string): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByProductIdAndUserId(productId: string, userId: string): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { productId, userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<Asset | null> {
    return prisma.asset.findUnique({
      where: { id },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Asset | null> {
    return prisma.asset.findFirst({
      where: { id, userId },
    });
  }

  async updateSegmentation(
    id: string,
    maskPath?: string,
    foregroundPath?: string,
    segmentationModel?: string,
    segmentationVersion?: string,
    segmentationStatus?: string
  ): Promise<Asset> {
    return prisma.asset.update({
      where: { id },
      data: {
        maskPath,
        foregroundPath,
        segmentationModel,
        segmentationVersion,
        segmentationStatus: segmentationStatus ?? (maskPath ? "COMPLETED" : undefined),
      },
    });
  }

  async create(data: CreateAssetInput): Promise<Asset> {
    return prisma.asset.create({
      data: {
        id: data.id,
        userId: data.userId,
        productId: data.productId,
        originalName: data.originalName,
        relativePath: data.relativePath,
        mime: data.mime,
        bytes: data.bytes,
        width: data.width,
        height: data.height,
        format: data.format,
        maskPath: data.maskPath,
        foregroundPath: data.foregroundPath,
        segmentationModel: data.segmentationModel,
        segmentationVersion: data.segmentationVersion,
        segmentationStatus: data.segmentationStatus,
      },
    });
  }

  async delete(id: string, userId: string): Promise<Asset | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return null;

    return prisma.asset.delete({
      where: { id },
    });
  }
}

export const assetRepository = new AssetRepository();
