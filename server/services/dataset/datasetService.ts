import { AugmentationResultRepository } from "../../repositories/AugmentationResultRepository.ts";
import { DatasetRepository } from "../../repositories/DatasetRepository.ts";
import { ProductRepository } from "../../repositories/ProductRepository.ts";
import { QualityAssessmentRepository } from "../../repositories/QualityAssessmentRepository.ts";
import { defaultDatasetSplitter, DatasetSplitter } from "./datasetSplitter.ts";
import { defaultManifestGenerator, ManifestGenerator } from "./manifestGenerator.ts";
import type {
  DatasetItemProvenance,
  DatasetItemRecord,
  DatasetManifest,
  DatasetSplit,
  DatasetSplitConfig,
} from "./types.ts";
import { defaultZipExporter, ZipExporter } from "./zipExporter.ts";
import type { Writable } from "node:stream";

interface RawCandidateItem {
  productId: string;
  sku: string;
  productName: string;
  isOriginal: boolean;
  originalAssetId?: string;
  augmentationResultId?: string;
  imagePath: string;
  workflowId?: string;
  workflowVersion?: string;
  prompt?: string;
  seed?: string;
  vlmProvider?: string;
  qualityScore?: number;
  qualityDecision?: string;
}

export class DatasetService {
  private datasetRepo: DatasetRepository;
  private productRepo: ProductRepository;
  private augRepo: AugmentationResultRepository;
  private qualityRepo: QualityAssessmentRepository;
  private splitter: DatasetSplitter;
  private manifestGen: ManifestGenerator;
  private zipExporter: ZipExporter;

  constructor(
    datasetRepo = new DatasetRepository(),
    productRepo = new ProductRepository(),
    augRepo = new AugmentationResultRepository(),
    qualityRepo = new QualityAssessmentRepository(),
    splitter = defaultDatasetSplitter,
    manifestGen = defaultManifestGenerator,
    zipExporter = defaultZipExporter
  ) {
    this.datasetRepo = datasetRepo;
    this.productRepo = productRepo;
    this.augRepo = augRepo;
    this.qualityRepo = qualityRepo;
    this.splitter = splitter;
    this.manifestGen = manifestGen;
    this.zipExporter = zipExporter;
  }

  /**
   * Creates a versioned catalog dataset partitioned at the SKU level
   */
  async createDataset(
    userId: string,
    params: {
      name: string;
      version?: string;
      description?: string;
      splitConfig?: Partial<DatasetSplitConfig>;
    }
  ) {
    const config: DatasetSplitConfig = {
      trainRatio: params.splitConfig?.trainRatio ?? 0.7,
      valRatio: params.splitConfig?.valRatio ?? 0.15,
      testRatio: params.splitConfig?.testRatio ?? 0.15,
      randomSeed: params.splitConfig?.randomSeed ?? 42,
      includeOriginals: params.splitConfig?.includeOriginals ?? true,
      minQualityScore: params.splitConfig?.minQualityScore ?? 60,
      onlyApproved: params.splitConfig?.onlyApproved ?? false,
    };

    // 1. Fetch user products
    const products = await this.productRepo.findByUserId(userId);
    if (!products || products.length === 0) {
      throw new Error("No products found for dataset creation.");
    }

    // 2. Aggregate candidate images for each product
    const candidateItems: RawCandidateItem[] = [];

    for (const prod of products) {
      const sku = prod.sku || prod.id;
      const images = (prod as unknown as { images?: Array<{ id: string; relativePath: string }> }).images || [];

      // Include original authentic photo if enabled
      if (config.includeOriginals && images.length > 0) {
        candidateItems.push({
          productId: prod.id,
          sku,
          productName: prod.name,
          isOriginal: true,
          originalAssetId: images[0].id,
          imagePath: images[0].relativePath,
        });
      }

      // Include augmentation variants
      const variants = await this.augRepo.findByProductId(prod.id);
      for (const v of variants) {
        // Optional filters
        if (config.onlyApproved && v.reviewDecision !== "APPROVED") {
          continue;
        }

        const qa = await this.qualityRepo.findByResultId(v.id);
        if (config.minQualityScore && qa && qa.compositeScore < config.minQualityScore) {
          continue;
        }

        candidateItems.push({
          productId: prod.id,
          sku,
          productName: prod.name,
          isOriginal: false,
          originalAssetId: v.originalAssetId || undefined,
          augmentationResultId: v.id,
          imagePath: v.imagePath,
          workflowId: v.workflowId,
          workflowVersion: v.workflowVersion,
          prompt: v.prompt || undefined,
          seed: v.seed !== null ? String(v.seed) : undefined,
          qualityScore: qa?.compositeScore,
          qualityDecision: qa?.decision || v.reviewDecision,
        });
      }
    }

    if (candidateItems.length === 0) {
      throw new Error("No qualifying images found matching dataset filter criteria.");
    }

    // 3. Partition items strictly at the product SKU level
    const partitioned = this.splitter.partition(candidateItems, config);

    // 4. Persist Dataset record
    const dataset = await this.datasetRepo.create({
      userId,
      name: params.name,
      version: params.version || "1.0.0",
      description: params.description,
      splitConfig: config as unknown as Record<string, unknown>,
      totalProducts: partitioned.productSplitMap.size,
      totalImages: candidateItems.length,
    });

    // 5. Persist DatasetItem records
    const itemRecords = candidateItems.map((c) => {
      const split = partitioned.productSplitMap.get(c.productId) || "train";
      return {
        datasetId: dataset.id,
        productId: c.productId,
        sku: c.sku,
        split,
        augmentationResultId: c.augmentationResultId || null,
        imagePath: c.imagePath,
        isOriginal: c.isOriginal,
        metadata: {
          productName: c.productName,
          workflowId: c.workflowId,
          workflowVersion: c.workflowVersion,
          prompt: c.prompt,
          seed: c.seed,
          qualityScore: c.qualityScore,
          qualityDecision: c.qualityDecision,
          isOriginal: c.isOriginal,
        },
      };
    });

    await this.datasetRepo.createItems(itemRecords);

    return {
      dataset,
      summary: partitioned.summary,
    };
  }

  /**
   * Assembles a complete DatasetManifest structure
   */
  async getDatasetManifest(datasetId: string, userId: string): Promise<DatasetManifest> {
    const dataset = await this.datasetRepo.findById(datasetId, userId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const items = await this.datasetRepo.findItemsByDatasetId(datasetId);
    const splitConfig = dataset.splitConfig as unknown as DatasetSplitConfig;

    const records: DatasetItemRecord[] = items.map((it) => {
      const ext = it.imagePath.split(".").pop() || "png";
      const archivePath = `images/${it.split}/${it.sku}_${it.id.slice(0, 8)}.${ext}`;

      return {
        id: it.id,
        productId: it.productId,
        sku: it.sku,
        split: it.split as DatasetSplit,
        imagePath: it.imagePath,
        archivePath,
        isOriginal: it.isOriginal,
        metadata: (it.metadata as unknown as DatasetItemProvenance) || {
          productId: it.productId,
          sku: it.sku,
          productName: it.product?.name || "",
          isOriginal: it.isOriginal,
        },
      };
    });

    // Compute breakdown counts
    const splitBreakdown = {
      train: { products: new Set<string>(), images: 0 },
      val: { products: new Set<string>(), images: 0 },
      test: { products: new Set<string>(), images: 0 },
    };

    for (const r of records) {
      splitBreakdown[r.split].products.add(r.productId);
      splitBreakdown[r.split].images++;
    }

    return {
      datasetId: dataset.id,
      name: dataset.name,
      version: dataset.version,
      schemaVersion: "1.0.0",
      exportTimestamp: new Date().toISOString(),
      splitConfig,
      totalProducts: dataset.totalProducts,
      totalImages: records.length,
      splitBreakdown: {
        train: { products: splitBreakdown.train.products.size, images: splitBreakdown.train.images },
        val: { products: splitBreakdown.val.products.size, images: splitBreakdown.val.images },
        test: { products: splitBreakdown.test.products.size, images: splitBreakdown.test.images },
      },
      records,
    };
  }

  async getJsonManifest(datasetId: string, userId: string): Promise<string> {
    const manifest = await this.getDatasetManifest(datasetId, userId);
    return this.manifestGen.generateJson(manifest);
  }

  async getCsvManifest(datasetId: string, userId: string): Promise<string> {
    const manifest = await this.getDatasetManifest(datasetId, userId);
    return this.manifestGen.generateCsv(manifest);
  }

  async exportZip(datasetId: string, userId: string, destination: Writable): Promise<void> {
    const manifest = await this.getDatasetManifest(datasetId, userId);
    const jsonStr = this.manifestGen.generateJson(manifest);
    const csvStr = this.manifestGen.generateCsv(manifest);

    // Validate integrity before streaming
    const integrity = await this.zipExporter.validateIntegrity(manifest);
    if (!integrity.valid) {
      console.warn(
        `[DatasetService] Exporting dataset with ${integrity.missingCount} unresolvable images.`
      );
    }

    await this.zipExporter.streamZip(manifest, jsonStr, csvStr, destination);
  }

  async listDatasets(userId: string) {
    return this.datasetRepo.findByUserId(userId);
  }

  async getDataset(datasetId: string, userId: string) {
    return this.datasetRepo.findById(datasetId, userId);
  }

  async deleteDataset(datasetId: string, userId: string) {
    return this.datasetRepo.delete(datasetId, userId);
  }
}

export const defaultDatasetService = new DatasetService();
