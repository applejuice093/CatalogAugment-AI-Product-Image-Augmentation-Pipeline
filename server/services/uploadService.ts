import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config/unifiedConfig.ts";
import { AssetRepository, assetRepository } from "../repositories/AssetRepository.ts";

export interface SaveUploadParams {
  userId: string;
  originalName: string;
  mime: string;
  buffer: Buffer;
}

export interface StoredUploadResult {
  id: string;
  originalName: string;
  bytes: number;
  relativePath: string;
}

export class UploadService {
  private readonly repository: AssetRepository;

  constructor(repository: AssetRepository = assetRepository) {
    this.repository = repository;
  }

  private isInsideRoot(targetPath: string): boolean {
    const rootWithSep = config.storage.uploadRoot.endsWith(path.sep)
      ? config.storage.uploadRoot
      : config.storage.uploadRoot + path.sep;
    const resolved = path.resolve(targetPath);
    return resolved.startsWith(rootWithSep);
  }

  async listUserUploads(userId: string) {
    const assets = await this.repository.findByUserId(userId);
    return assets.map((item) => ({
      id: item.id,
      originalName: item.originalName,
      mime: item.mime,
      bytes: item.bytes,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async getUploadFile(userId: string, id: string): Promise<{ mime: string; data: Buffer } | null> {
    const asset = await this.repository.findByIdAndUserId(id, userId);
    if (!asset) return null;

    if (asset.relativePath.includes("..")) return null;

    const fullPath = path.resolve(config.storage.uploadRoot, ...asset.relativePath.split("/"));
    if (!this.isInsideRoot(fullPath)) return null;

    try {
      const data = await fs.readFile(fullPath);
      return { mime: asset.mime, data };
    } catch {
      return null;
    }
  }

  async saveUpload({ userId, originalName, mime, buffer }: SaveUploadParams): Promise<StoredUploadResult> {
    const ext = config.storage.mimeExtensionMap[mime];
    if (!ext) {
      throw new Error("Unsupported image format. Allowed formats: JPEG, PNG, WebP.");
    }

    if (buffer.length > config.storage.maxFileSizeBytes) {
      throw new Error(`File exceeds maximum size of ${config.storage.maxFileSizeBytes / 1024 / 1024} MB.`);
    }

    const id = randomUUID();
    const filename = `${id}.${ext}`;
    const userDir = path.join(config.storage.uploadRoot, userId);
    const fullPath = path.join(userDir, filename);

    if (!this.isInsideRoot(fullPath)) {
      throw new Error("Invalid destination path.");
    }

    await fs.mkdir(userDir, { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const relativePath = path.posix.join(userId, filename);

    await this.repository.create({
      id,
      userId,
      originalName: path.basename(originalName).slice(0, 180) || filename,
      relativePath,
      mime,
      bytes: buffer.byteLength,
    });

    return {
      id,
      originalName,
      bytes: buffer.byteLength,
      relativePath,
    };
  }
}

export const uploadService = new UploadService();
