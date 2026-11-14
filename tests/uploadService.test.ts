import { describe, expect, it, vi } from "vitest";
import { UploadService } from "../server/services/uploadService.ts";
import type { AssetRepository } from "../server/repositories/AssetRepository.ts";

describe("UploadService Unit Tests", () => {
  const mockAsset = {
    id: "test-uuid-1234",
    userId: "user-1",
    originalName: "test-shoe.jpg",
    relativePath: "user-1/test-uuid-1234.jpg",
    mime: "image/jpeg",
    bytes: 1024,
    createdAt: new Date("2026-11-14T10:00:00.000Z"),
  };

  const mockRepository: AssetRepository = {
    findByUserId: vi.fn().mockResolvedValue([mockAsset]),
    findByIdAndUserId: vi.fn().mockResolvedValue(mockAsset),
    create: vi.fn().mockResolvedValue(mockAsset),
    delete: vi.fn().mockResolvedValue(mockAsset),
  };

  it("listUserUploads formats asset records into client response", async () => {
    const service = new UploadService(mockRepository);
    const list = await service.listUserUploads("user-1");

    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      id: "test-uuid-1234",
      originalName: "test-shoe.jpg",
      mime: "image/jpeg",
      bytes: 1024,
      createdAt: "2026-11-14T10:00:00.000Z",
    });
    expect(mockRepository.findByUserId).toHaveBeenCalledWith("user-1");
  });

  it("saveUpload throws when unsupported mime type is supplied", async () => {
    const service = new UploadService(mockRepository);

    await expect(
      service.saveUpload({
        userId: "user-1",
        originalName: "malicious.exe",
        mime: "application/x-msdownload",
        buffer: Buffer.from("fake"),
      })
    ).rejects.toThrow("Unsupported image format");
  });

  it("saveUpload throws when file exceeds size limit", async () => {
    const service = new UploadService(mockRepository);
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB > 10MB limit

    await expect(
      service.saveUpload({
        userId: "user-1",
        originalName: "large.png",
        mime: "image/png",
        buffer: oversizedBuffer,
      })
    ).rejects.toThrow("File exceeds maximum size");
  });
});
