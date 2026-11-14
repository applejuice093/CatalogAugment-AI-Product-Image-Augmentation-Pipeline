import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config/unifiedConfig.ts";
import { AssetRepository } from "../../repositories/AssetRepository.ts";
import { AugmentationResultRepository } from "../../repositories/AugmentationResultRepository.ts";
import { ProductRepository } from "../../repositories/ProductRepository.ts";
import { VLMAnalysisRepository } from "../../repositories/VLMAnalysisRepository.ts";
import type {
  ImageConsistencyOutput,
  ProductAnalysisOutput,
  VLMExecutionResult,
} from "./types.ts";
import { VLMOrchestrator, defaultVLMOrchestrator } from "./vlmOrchestrator.ts";

export class VLMService {
  private orchestrator: VLMOrchestrator;
  private productRepo: ProductRepository;
  private assetRepo: AssetRepository;
  private resultRepo: AugmentationResultRepository;
  private vlmRepo: VLMAnalysisRepository;

  constructor(
    orchestrator: VLMOrchestrator = defaultVLMOrchestrator,
    productRepo: ProductRepository = new ProductRepository(),
    assetRepo: AssetRepository = new AssetRepository(),
    resultRepo: AugmentationResultRepository = new AugmentationResultRepository(),
    vlmRepo: VLMAnalysisRepository = new VLMAnalysisRepository()
  ) {
    this.orchestrator = orchestrator;
    this.productRepo = productRepo;
    this.assetRepo = assetRepo;
    this.resultRepo = resultRepo;
    this.vlmRepo = vlmRepo;
  }

  /**
   * Task A: Analyze an authentic product photograph to extract structured visual intelligence
   */
  async analyzeProduct(
    productId: string,
    userId: string,
    preferredProvider?: string
  ): Promise<VLMExecutionResult<ProductAnalysisOutput>> {
    const product = await this.productRepo.findByIdAndUserId(productId, userId);
    if (!product) {
      throw new Error(`Product not found or access denied: ${productId}`);
    }

    const images = (product as unknown as { images?: Array<{ id: string; relativePath: string }> }).images || [];
    if (images.length === 0) {
      throw new Error("No product image found for visual analysis.");
    }

    const targetAsset = images[0];
    const imageFullPath = path.resolve(config.storage.uploadRoot, targetAsset.relativePath);
    const imageBuffer = await fs.readFile(imageFullPath);

    const result = await this.orchestrator.analyzeProduct(
      imageBuffer,
      preferredProvider
    );

    // Persist VLM analysis record
    await this.vlmRepo.create({
      productId: product.id,
      taskType: result.taskType,
      provider: result.provider,
      modelName: result.modelName,
      promptVersion: result.promptVersion,
      rawOutput: result.rawOutput,
      normalizedData: result.data as unknown as Record<string, unknown>,
      confidence: result.confidence,
      latencyMs: result.latencyMs,
    });

    // Optionally enrich product metadata if currently missing
    if (!product.category || !product.description) {
      await this.productRepo.update(product.id, userId, {
        category: product.category || result.data.category,
        subcategory: product.subcategory || result.data.subcategory,
        description: product.description || result.data.description,
      });
    }

    return result;
  }

  /**
   * Task B: Compare original product with generated augmented variant for identity preservation
   */
  async compareAugmentationVariant(
    resultId: string,
    userId: string,
    preferredProvider?: string
  ): Promise<VLMExecutionResult<ImageConsistencyOutput>> {
    const augResult = await this.resultRepo.findById(resultId);
    if (!augResult) {
      throw new Error(`Augmentation result not found: ${resultId}`);
    }

    const product = await this.productRepo.findByIdAndUserId(augResult.productId, userId);
    if (!product) {
      throw new Error("Associated product not found or access denied.");
    }

    // Resolve original asset image
    let origAsset = augResult.originalAssetId
      ? await this.assetRepo.findById(augResult.originalAssetId)
      : null;

    if (!origAsset) {
      const productImages = (product as unknown as { images?: Array<{ id: string }> }).images || [];
      if (productImages.length > 0) {
        origAsset = await this.assetRepo.findById(productImages[0].id);
      }
    }

    if (!origAsset) {
      throw new Error("Original product image could not be resolved for comparison.");
    }

    const origFullPath = path.resolve(config.storage.uploadRoot, origAsset.relativePath);
    const augFullPath = path.resolve(config.storage.uploadRoot, augResult.imagePath);

    const origBuffer = await fs.readFile(origFullPath);
    const augBuffer = await fs.readFile(augFullPath);

    const result = await this.orchestrator.compareConsistency(
      origBuffer,
      augBuffer,
      preferredProvider
    );

    // Persist consistency analysis record
    await this.vlmRepo.create({
      productId: product.id,
      augmentationResultId: augResult.id,
      taskType: result.taskType,
      provider: result.provider,
      modelName: result.modelName,
      promptVersion: result.promptVersion,
      rawOutput: result.rawOutput,
      normalizedData: result.data as unknown as Record<string, unknown>,
      isConsistent: result.isConsistent,
      confidence: result.confidence,
      latencyMs: result.latencyMs,
    });

    return result;
  }

  /**
   * Retrieve all historical analyses for a product
   */
  async getProductAnalyses(productId: string, userId: string): Promise<unknown[]> {
    const product = await this.productRepo.findByIdAndUserId(productId, userId);
    if (!product) {
      throw new Error(`Product not found or access denied: ${productId}`);
    }
    return this.vlmRepo.findByProductId(productId);
  }

  /**
   * Retrieve analyses for an augmentation variant
   */
  async getResultAnalyses(resultId: string): Promise<unknown[]> {
    return this.vlmRepo.findByResultId(resultId);
  }

  /**
   * Discover and report status of registered VLM providers
   */
  async getProvidersStatus(): Promise<Array<{ name: string; modelName: string; isHealthy: boolean }>> {
    const registered = this.orchestrator.getRegisteredProviders();
    const statuses = await Promise.all(
      registered.map(async (p) => {
        const prov = await this.orchestrator.resolveProvider(p.name);
        const isHealthy = await prov.checkHealth();
        return {
          name: p.name,
          modelName: p.modelName,
          isHealthy,
        };
      })
    );
    return statuses;
  }
}

export const defaultVLMService = new VLMService();
