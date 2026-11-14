import type { Product } from "@prisma/client";
import { prisma } from "../db/prisma.ts";
import type { CreateProductInput, UpdateProductInput } from "../validators/product.schema.ts";

export class ProductRepository {
  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
      },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: { id, userId },
      include: {
        images: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<Product[]> {
    return prisma.product.findMany({
      where: { userId },
      include: {
        images: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findBySku(sku: string, userId: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: { sku, userId },
    });
  }

  async create(userId: string, data: CreateProductInput): Promise<Product> {
    return prisma.product.create({
      data: {
        userId,
        name: data.name,
        sku: data.sku,
        category: data.category,
        subcategory: data.subcategory,
        description: data.description,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateProductInput): Promise<Product | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return null;

    return prisma.product.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        sku: data.sku ?? existing.sku,
        category: data.category ?? existing.category,
        subcategory: data.subcategory ?? existing.subcategory,
        description: data.description ?? existing.description,
      },
    });
  }

  async delete(id: string, userId: string): Promise<Product | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return null;

    return prisma.product.delete({
      where: { id },
    });
  }
}

export const productRepository = new ProductRepository();
