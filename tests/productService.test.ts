import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import type { AssetRepository } from "../server/repositories/AssetRepository.ts";
import type { ProductRepository } from "../server/repositories/ProductRepository.ts";
import { ImageNormalizationService } from "../server/services/imageNormalizationService.ts";
import { ProductService } from "../server/services/productService.ts";
import { SegmentationService } from "../server/services/segmentationService.ts";

describe("ProductService Unit Tests", () => {
  const mockProduct = {
    id: "prod-uuid-1",
    userId: "user-1",
    name: "Classic Mesh Runner",
    sku: "SHOE-RUNNER-001",
    category: "Footwear",
    subcategory: "Athletic",
    description: "Breathable performance mesh runner.",
    createdAt: new Date("2026-11-14T10:00:00.000Z"),
    updatedAt: new Date("2026-11-14T10:00:00.000Z"),
  };

  const mockProductRepo: ProductRepository = {
    findById: vi.fn().mockResolvedValue(mockProduct),
    findByIdAndUserId: vi.fn().mockResolvedValue(mockProduct),
    findByUserId: vi.fn().mockResolvedValue([mockProduct]),
    findBySku: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(mockProduct),
    update: vi.fn().mockResolvedValue(mockProduct),
    delete: vi.fn().mockResolvedValue(mockProduct),
  };

  const mockAsset = {
    id: "asset-uuid-1",
    userId: "user-1",
    productId: "prod-uuid-1",
    originalName: "shoe.png",
    relativePath: "user-1/prod-uuid-1/asset-uuid-1.png",
    mime: "image/png",
    bytes: 4096,
    width: 200,
    height: 200,
    format: "png",
    maskPath: "user-1/prod-uuid-1/asset-uuid-1_mask.png",
    foregroundPath: "user-1/prod-uuid-1/asset-uuid-1_foreground.png",
    segmentationModel: "rembg-u2net-standalone",
    segmentationVersion: "1.0.0",
    segmentationStatus: "COMPLETED",
    createdAt: new Date("2026-11-14T10:00:00.000Z"),
  };

  const mockAssetRepo: AssetRepository = {
    findByUserId: vi.fn().mockResolvedValue([mockAsset]),
    findByProductIdAndUserId: vi.fn().mockResolvedValue([mockAsset]),
    findByIdAndUserId: vi.fn().mockResolvedValue(mockAsset),
    create: vi.fn().mockResolvedValue(mockAsset),
    delete: vi.fn().mockResolvedValue(mockAsset),
  };

  it("createProduct creates product and checks SKU collision", async () => {
    const service = new ProductService(mockProductRepo, mockAssetRepo);
    const result = await service.createProduct("user-1", {
      name: "Classic Mesh Runner",
      sku: "SHOE-RUNNER-001",
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Classic Mesh Runner");
    expect(mockProductRepo.findBySku).toHaveBeenCalledWith("SHOE-RUNNER-001", "user-1");
  });

  it("uploadProductImage normalizes, segments, and stores asset record", async () => {
    const normalizer = new ImageNormalizationService();
    const segmenter = new SegmentationService();
    const service = new ProductService(mockProductRepo, mockAssetRepo, normalizer, segmenter);

    // Create a 100x100 test image
    const testBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.uploadProductImage({
      userId: "user-1",
      productId: "prod-uuid-1",
      originalName: "shoe.png",
      mime: "image/png",
      buffer: testBuffer,
    });

    expect(result.productId).toBe("prod-uuid-1");
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(result.urls.original).toContain("/api/products/prod-uuid-1/images/");
    expect(result.urls.mask).toContain("/mask");
    expect(result.urls.foreground).toContain("/foreground");
    expect(result.segmentation.status).toBe("COMPLETED");
    expect(mockAssetRepo.create).toHaveBeenCalled();
  });

  it("listProductImages returns mapped URLs including mask and cutout endpoints", async () => {
    const service = new ProductService(mockProductRepo, mockAssetRepo);
    const list = await service.listProductImages("user-1", "prod-uuid-1");

    expect(list).toHaveLength(1);
    expect(list[0].urls.mask).toBe("/api/products/prod-uuid-1/images/asset-uuid-1/mask");
    expect(list[0].urls.foreground).toBe("/api/products/prod-uuid-1/images/asset-uuid-1/foreground");
  });
});
