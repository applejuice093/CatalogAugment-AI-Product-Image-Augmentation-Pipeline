import type { Asset } from "@prisma/client";
import { prisma } from "../db/prisma.ts";

export interface CreateAssetInput {
  id: string;
  userId: string;
  originalName: string;
  relativePath: string;
  mime: string;
  bytes: number;
}

export class AssetRepository {
  async findByUserId(userId: string): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Asset | null> {
    return prisma.asset.findFirst({
      where: { id, userId },
    });
  }

  async create(data: CreateAssetInput): Promise<Asset> {
    return prisma.asset.create({
      data: {
        id: data.id,
        userId: data.userId,
        originalName: data.originalName,
        relativePath: data.relativePath,
        mime: data.mime,
        bytes: data.bytes,
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
