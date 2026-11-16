import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config/unifiedConfig.ts";
import { AssetRepository, assetRepository } from "../repositories/AssetRepository.ts";
import { ProductRepository, productRepository } from "../repositories/ProductRepository.ts";
import type { CreateProductInput, UpdateProductInput } from "../validators/product.schema.ts";
import { ImageNormalizationService, imageNormalizationService } from "./imageNormalizationService.ts";
import { SegmentationService, segmentationService } from "./segmentationService.ts";

export interface UploadProductImageParams {
  userId: string;
  productId: string;
  originalName: string;
  mime: string;
  buffer: Buffer;
}

export interface IngestedProductImageResult {
  id: string;
  productId: string;
  originalName: string;
  width: number;
  height: number;
  format: string;
  aspectRatio: number;
  bytes: number;
  urls: {
    original: string;
    mask: string;
    foreground: string;
  };
  segmentation: {
    status: string;
    modelName: string;
    modelVersion: string;
  };
}

export class ProductService {
  private readonly productRepo: ProductRepository;
  private readonly assetRepo: AssetRepository;
  private readonly normalizer: ImageNormalizationService;
  private readonly segmenter: SegmentationService;

  constructor(
    productRepo: ProductRepository = productRepository,
    assetRepo: AssetRepository = assetRepository,
    normalizer: ImageNormalizationService = imageNormalizationService,
    segmenter: SegmentationService = segmentationService
  ) {
    this.productRepo = productRepo;
    this.assetRepo = assetRepo;
    this.normalizer = normalizer;
    this.segmenter = segmenter;
  }

  private isInsideRoot(targetPath: string): boolean {
    const rootWithSep = config.storage.uploadRoot.endsWith(path.sep)
      ? config.storage.uploadRoot
      : config.storage.uploadRoot + path.sep;
    const resolved = path.resolve(targetPath);
    return resolved.startsWith(rootWithSep);
  }

  async listProducts(userId: string) {
    return this.productRepo.findByUserId(userId);
  }

  async getProduct(userId: string, productId: string) {
    const product = await this.productRepo.findByIdAndUserId(productId, userId);
    if (!product) {
      throw new Error("Product not found.");
    }
    return product;
  }

  async createProduct(userId: string, data: CreateProductInput) {
    if (data.sku) {
      const existing = await this.productRepo.findBySku(data.sku, userId);
      if (existing) {
        throw new Error(`Product with SKU '${data.sku}' already exists.`);
      }
    }
    return this.productRepo.create(userId, data);
  }

  async updateProduct(userId: string, productId: string, data: UpdateProductInput) {
    const existing = await this.getProduct(userId, productId);
    if (data.sku && data.sku !== existing.sku) {
      const conflict = await this.productRepo.findBySku(data.sku, userId);
      if (conflict) {
        throw new Error(`Product with SKU '${data.sku}' already exists.`);
      }
    }
    return this.productRepo.update(productId, userId, data);
  }

  async deleteProduct(userId: string, productId: string) {
    await this.getProduct(userId, productId);
    return this.productRepo.delete(productId, userId);
  }

  async uploadProductImage({
    userId,
    productId,
    originalName,
    mime,
    buffer,
  }: UploadProductImageParams): Promise<IngestedProductImageResult> {
    // 1. Verify product exists and belongs to user
    await this.getProduct(userId, productId);

    // 2. Decode, inspect, and normalize original image (EXIF orientation, sRGB)
    const normalized = await this.normalizer.normalizeImage(buffer, mime);

    // 3. Prepare storage destination
    const imageId = randomUUID();
    const ext = config.storage.mimeExtensionMap[normalized.mime] ?? "png";
    const baseFilename = `${imageId}.${ext}`;
    const maskFilename = `${imageId}_mask.png`;
    const foregroundFilename = `${imageId}_foreground.png`;

    const productDir = path.join(config.storage.uploadRoot, userId, productId);
    const originalFullPath = path.join(productDir, baseFilename);
    const maskFullPath = path.join(productDir, maskFilename);
    const foregroundFullPath = path.join(productDir, foregroundFilename);

    if (!this.isInsideRoot(originalFullPath)) {
      throw new Error("Invalid destination path.");
    }

    await fs.mkdir(productDir, { recursive: true });

    // 4. Save normalized original image
    await fs.writeFile(originalFullPath, normalized.buffer);

    // 5. Execute segmentation interface
    const segmentation = await this.segmenter.processSegmentation(imageId, normalized.buffer);

    // 6. Save mask & foreground cutouts
    await fs.writeFile(maskFullPath, segmentation.maskBuffer);
    await fs.writeFile(foregroundFullPath, segmentation.foregroundBuffer);

    // 7. Persist relative paths
    const relativeOriginal = path.posix.join(userId, productId, baseFilename);
    const relativeMask = path.posix.join(userId, productId, maskFilename);
    const relativeForeground = path.posix.join(userId, productId, foregroundFilename);

    await this.assetRepo.create({
      id: imageId,
      userId,
      productId,
      originalName: path.basename(originalName).slice(0, 180) || baseFilename,
      relativePath: relativeOriginal,
      mime: normalized.mime,
      bytes: normalized.buffer.byteLength,
      width: normalized.width,
      height: normalized.height,
      format: normalized.format,
      maskPath: relativeMask,
      foregroundPath: relativeForeground,
      segmentationModel: segmentation.modelName,
      segmentationVersion: segmentation.modelVersion,
      segmentationStatus: segmentation.status,
    });

    return {
      id: imageId,
      productId,
      originalName,
      width: normalized.width,
      height: normalized.height,
      format: normalized.format,
      aspectRatio: normalized.aspectRatio,
      bytes: normalized.buffer.byteLength,
      urls: {
        original: `/api/products/${productId}/images/${imageId}`,
        mask: `/api/products/${productId}/images/${imageId}/mask`,
        foreground: `/api/products/${productId}/images/${imageId}/foreground`,
      },
      segmentation: {
        status: segmentation.status,
        modelName: segmentation.modelName,
        modelVersion: segmentation.modelVersion,
      },
    };
  }

  async listProductImages(userId: string, productId: string) {
    await this.getProduct(userId, productId);
    const images = await this.assetRepo.findByProductIdAndUserId(productId, userId);

    return images.map((item) => ({
      id: item.id,
      productId: item.productId,
      originalName: item.originalName,
      mime: item.mime,
      bytes: item.bytes,
      width: item.width,
      height: item.height,
      format: item.format,
      segmentationStatus: item.segmentationStatus,
      segmentationModel: item.segmentationModel,
      urls: {
        original: `/api/products/${productId}/images/${item.id}`,
        mask: item.maskPath ? `/api/products/${productId}/images/${item.id}/mask` : null,
        foreground: item.foregroundPath ? `/api/products/${productId}/images/${item.id}/foreground` : null,
      },
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async getProductImageFile(
    userId: string,
    productId: string,
    imageId: string,
    type: "original" | "mask" | "foreground" = "original"
  ): Promise<{ mime: string; data: Buffer } | null> {
    await this.getProduct(userId, productId);
    const asset = await this.assetRepo.findByIdAndUserId(imageId, userId);
    if (!asset || asset.productId !== productId) return null;

    let targetRelativePath: string | null = asset.relativePath;
    let targetMime = asset.mime;

    if (type === "mask") {
      targetRelativePath = asset.maskPath;
      targetMime = "image/png";
    } else if (type === "foreground") {
      targetRelativePath = asset.foregroundPath;
      targetMime = "image/png";
    }

    if (!targetRelativePath || targetRelativePath.includes("..")) return null;

    const fullPath = path.resolve(config.storage.uploadRoot, ...targetRelativePath.split("/"));
    if (!this.isInsideRoot(fullPath)) return null;

    try {
      const data = await fs.readFile(fullPath);
      return { mime: targetMime, data };
    } catch {
      return null;
    }
  }
}

export const productService = new ProductService();
