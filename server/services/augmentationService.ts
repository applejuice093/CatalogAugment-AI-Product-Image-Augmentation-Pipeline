import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { config } from "../config/unifiedConfig.ts";
import { AssetRepository } from "../repositories/AssetRepository.ts";
import { AugmentationJobRepository } from "../repositories/AugmentationJobRepository.ts";
import { AugmentationResultRepository } from "../repositories/AugmentationResultRepository.ts";
import { ProductRepository } from "../repositories/ProductRepository.ts";
import type { CreateAugmentationJobInput } from "../validators/augmentation.schema.ts";
import { type IComfyUIClient, defaultComfyUIClient } from "./comfyui/comfyuiClient.ts";
import type { AugmentationProgress } from "./comfyui/types.ts";
import { WorkflowRegistry, defaultWorkflowRegistry } from "./comfyui/workflowRegistry.ts";
import {
  ForegroundCompositingService,
  defaultForegroundCompositingService,
} from "./foregroundCompositingService.ts";
import {
  GeometricTransformationService,
  defaultGeometricTransformationService,
  type AnglePreset,
} from "./geometricTransformationService.ts";
import { SegmentationService } from "./segmentationService.ts";
import { defaultQualityAssessmentService } from "./quality/qualityAssessmentService.ts";

export class AugmentationService {
  private comfyuiClient: IComfyUIClient;
  private workflowRegistry: WorkflowRegistry;
  private jobRepo: AugmentationJobRepository;
  private resultRepo: AugmentationResultRepository;
  private productRepo: ProductRepository;
  private assetRepo: AssetRepository;
  private segmentationService: SegmentationService;
  private compositingService: ForegroundCompositingService;
  private geometricService: GeometricTransformationService;

  constructor(
    comfyuiClient: IComfyUIClient = defaultComfyUIClient,
    workflowRegistry: WorkflowRegistry = defaultWorkflowRegistry,
    jobRepo: AugmentationJobRepository = new AugmentationJobRepository(),
    resultRepo: AugmentationResultRepository = new AugmentationResultRepository(),
    productRepo: ProductRepository = new ProductRepository(),
    assetRepo: AssetRepository = new AssetRepository(),
    segmentationService: SegmentationService = new SegmentationService(),
    compositingService: ForegroundCompositingService = defaultForegroundCompositingService,
    geometricService: GeometricTransformationService = defaultGeometricTransformationService
  ) {
    this.comfyuiClient = comfyuiClient;
    this.workflowRegistry = workflowRegistry;
    this.jobRepo = jobRepo;
    this.resultRepo = resultRepo;
    this.productRepo = productRepo;
    this.assetRepo = assetRepo;
    this.segmentationService = segmentationService;
    this.compositingService = compositingService;
    this.geometricService = geometricService;
  }

  /**
   * Submit an augmentation job and run generation through ComfyUI
   */
  async submitJob(
    userId: string,
    input: CreateAugmentationJobInput
  ): Promise<{ job: unknown; results?: unknown[] }> {
    // 1. Verify Product
    const product = await this.productRepo.findByIdAndUserId(input.productId, userId);
    if (!product) {
      throw new Error(`Product not found or access denied: ${input.productId}`);
    }

    // 2. Resolve Input Asset
    let asset = input.inputAssetId
      ? await this.assetRepo.findById(input.inputAssetId)
      : null;

    if (!asset || asset.productId !== input.productId) {
      const productImages = (product as unknown as { images?: Array<{ id: string }> }).images;
      if (productImages && productImages.length > 0) {
        asset = await this.assetRepo.findById(productImages[0].id);
      }
    }

    if (!asset) {
      throw new Error("No valid input product image found for augmentation.");
    }

    // 3. Resolve Workflow
    const workflow = this.workflowRegistry.getWorkflow(input.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found or not supported: ${input.workflowId}`);
    }

    // 4. Ensure Mask Exists for Inpainting
    const inputImagePath = path.resolve(config.storage.uploadRoot, asset.relativePath);
    let maskRelativePath = asset.maskPath;

    if (!maskRelativePath) {
      const imageBuffer = await fs.readFile(inputImagePath);
      const segOutput = await this.segmentationService.segment(imageBuffer);

      const maskFileName = `mask_${Date.now()}_${path.basename(asset.relativePath, path.extname(asset.relativePath))}.png`;
      const maskSubdir = path.join("masks", new Date().toISOString().slice(0, 10));
      const fullMaskDir = path.join(config.storage.uploadRoot, maskSubdir);
      await fs.mkdir(fullMaskDir, { recursive: true });

      const fullMaskPath = path.join(fullMaskDir, maskFileName);
      await fs.writeFile(fullMaskPath, segOutput.maskBuffer);
      maskRelativePath = path.join(maskSubdir, maskFileName).replace(/\\/g, "/");

      await this.assetRepo.updateSegmentation(
        asset.id,
        maskRelativePath,
        undefined,
        segOutput.modelName,
        segOutput.modelVersion
      );
    }

    const maskFullPath = path.resolve(config.storage.uploadRoot, maskRelativePath);

    // 5. Create Database Job Record
    const job = await this.jobRepo.create({
      productId: product.id,
      userId,
      inputAssetId: asset.id,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      configJson: input as unknown as Record<string, unknown>,
    });

    // 6. Execute Generation Pipeline asynchronously in background
    void this.executeGeneration(
      job.id,
      product.id,
      asset.id,
      workflow,
      input,
      inputImagePath,
      maskFullPath,
      userId
    ).catch((err) => {
      console.error(`[AugmentationService] Generation pipeline failed for job ${job.id}:`, err);
    });

    return {
      job,
    };
  }

  /**
   * Internal pipeline executing ComfyUI workflow with controlled batching,
   * progress tracking, and foreground compositing preservation.
   */
  private async executeGeneration(
    jobId: string,
    productId: string,
    assetId: string,
    workflow: ReturnType<WorkflowRegistry["getWorkflow"]> & object,
    input: CreateAugmentationJobInput,
    inputImagePath: string,
    maskFullPath: string,
    userId: string
  ): Promise<unknown[]> {
    try {
      await this.jobRepo.updateStatus(jobId, "PROCESSING", 5);

      // Read image and mask files
      const inputBuffer = await fs.readFile(inputImagePath);
      const maskBuffer = await fs.readFile(maskFullPath);

      const numVariants = Math.max(1, Math.min(4, input.numVariants || input.batchSize || 1));
      const savedResults: unknown[] = [];

      const outputSubdir = path.join("augmented", new Date().toISOString().slice(0, 10));
      const fullOutputDir = path.join(config.storage.uploadRoot, outputSubdir);
      await fs.mkdir(fullOutputDir, { recursive: true });

      const baseSeed = input.seed ?? Math.floor(Math.random() * 1000000000);
      const presets = workflow.recommendedConfig?.presets;

      // Execute variants sequentially to strictly adhere to the 6GB VRAM budget
      for (let v = 0; v < numVariants; v++) {
        const variantSeed = baseSeed + v * 7919;
        
        // Resolve camera angle for this variant
        let chosenAngle: AnglePreset = "FRONTAL_STUDIO";
        if (input.cameraAngle === "AUTO_ROTATE" || !input.cameraAngle) {
          const rotationPresets: AnglePreset[] = [
            "THREE_QUARTER_YAW",
            "FLAT_LAY_TOPDOWN",
            "LOW_ANGLE_HERO",
            "CASUAL_HANDHELD_TILT",
          ];
          chosenAngle = numVariants > 1 ? rotationPresets[v % rotationPresets.length] : "FRONTAL_STUDIO";
        } else if (input.cameraAngle === "THREE_QUARTER") {
          chosenAngle = "THREE_QUARTER_YAW";
        } else if (input.cameraAngle === "FLAT_LAY") {
          chosenAngle = "FLAT_LAY_TOPDOWN";
        } else if (input.cameraAngle === "LOW_ANGLE") {
          chosenAngle = "LOW_ANGLE_HERO";
        } else if (input.cameraAngle === "CASUAL_TILT") {
          chosenAngle = "CASUAL_HANDHELD_TILT";
        }

        // Apply geometric 3D perspective warp to create authentic camera angles
        let variantInputBuffer = inputBuffer;
        let variantMaskBuffer = maskBuffer;
        let variantCutoutBuffer = inputBuffer;

        if (chosenAngle !== "FRONTAL_STUDIO") {
          try {
            const transformed = await this.geometricService.transformPerspective(
              inputImagePath,
              maskFullPath,
              { preset: chosenAngle }
            );
            variantInputBuffer = await fs.readFile(transformed.paths.rgb);
            variantMaskBuffer = await fs.readFile(transformed.paths.mask);
            variantCutoutBuffer = await fs.readFile(transformed.paths.cutout);
          } catch (geoErr) {
            console.warn(
              `[AugmentationService] Perspective transform failed for ${chosenAngle}, falling back to frontal:`,
              geoErr
            );
          }
        }

        // Upload perspective-transformed assets to ComfyUI for this variant
        const comfyInputFilename = `input_${jobId}_v${v + 1}_${Date.now()}.png`;
        const comfyMaskFilename = `mask_${jobId}_v${v + 1}_${Date.now()}.png`;

        await this.comfyuiClient.uploadImage(variantInputBuffer, comfyInputFilename);
        await this.comfyuiClient.uploadImage(variantMaskBuffer, comfyMaskFilename);

        // When multiple variants are requested, rotate through diverse curated style presets
        const activePreset = presets && presets.length > 0 ? presets[v % presets.length] : null;

        const variantConfig = {
          ...input,
          prompt:
            numVariants > 1 && activePreset
              ? activePreset.prompt
              : (input.prompt || activePreset?.prompt),
          negativePrompt:
            input.negativePrompt || activePreset?.negativePrompt,
          cfg: activePreset?.cfg ?? input.cfg,
          denoise: activePreset?.denoise ?? input.denoise,
          seed: variantSeed,
        };

        const executablePrompt = this.workflowRegistry.buildExecutablePrompt(
          workflow,
          variantConfig,
          comfyInputFilename,
          comfyMaskFilename
        );

        const promptId = await this.comfyuiClient.queuePrompt(executablePrompt, `${jobId}_v${v + 1}`);

        // Base progress allocation for this variant
        const progressBase = Math.floor((v / numVariants) * 90);
        const progressSpan = Math.floor(90 / numVariants);

        const imageOutputs = await this.comfyuiClient.trackExecution(
          promptId,
          `${jobId}_v${v + 1}`,
          async (progress: AugmentationProgress) => {
            const currentTotal = progressBase + Math.floor((progress.progressPercent / 100) * progressSpan);
            await this.jobRepo.updateProgress(jobId, currentTotal);
          }
        );

        for (let i = 0; i < imageOutputs.length; i++) {
          const output = imageOutputs[i];
          const rawGeneratedBuffer = await this.comfyuiClient.downloadImage(output);

          // Step 4 & 5: Original Foreground Compositing & Edge Refinement
          const compositingResult = await this.compositingService.composite(
            rawGeneratedBuffer,
            variantCutoutBuffer,
            variantMaskBuffer,
            {
              preserveOriginalForeground: input.preserveOriginalForeground ?? input.compositeForeground ?? true,
              enableEdgeRefinement: input.enableEdgeRefinement ?? true,
            }
          );

          const resultFilename = `aug_${jobId}_v${v + 1}_${i + 1}_${Date.now()}.png`;
          const resultRelativePath = path
            .join(outputSubdir, resultFilename)
            .replace(/\\/g, "/");
          const resultFullPath = path.join(fullOutputDir, resultFilename);

          await fs.writeFile(resultFullPath, compositingResult.compositeBuffer);

          // Generate fast thumbnail
          const thumbFilename = `thumb_${resultFilename}`;
          const thumbRelativePath = path
            .join(outputSubdir, thumbFilename)
            .replace(/\\/g, "/");
          const thumbFullPath = path.join(fullOutputDir, thumbFilename);

          await sharp(compositingResult.compositeBuffer)
            .resize(256, 256, { fit: "inside" })
            .png()
            .toFile(thumbFullPath);

          // Record in Database
          const resultRecord = await this.resultRepo.create({
            jobId,
            productId,
            originalAssetId: assetId,
            imagePath: resultRelativePath,
            thumbnailPath: thumbRelativePath,
            comfyFilename: output.filename,
            prompt: variantConfig.prompt ?? workflow.defaultParameters.prompt,
            negativePrompt:
              variantConfig.negativePrompt ?? workflow.defaultParameters.negativePrompt,
            seed: variantSeed,
            cfg: variantConfig.cfg ?? workflow.defaultParameters.cfg,
            steps: variantConfig.steps ?? workflow.defaultParameters.steps,
            denoise: variantConfig.denoise ?? workflow.defaultParameters.denoise,
            sampler: variantConfig.sampler ?? workflow.defaultParameters.sampler,
            workflowId: workflow.id,
            workflowVersion: workflow.version,
            isComposited: compositingResult.isComposited,
            compositionStrategy:
              chosenAngle !== "FRONTAL_STUDIO"
                ? `perspective_${chosenAngle.toLowerCase()}`
                : compositingResult.strategy,
            status: "COMPLETED",
            reviewDecision: "PENDING",
          });

          savedResults.push(resultRecord);

          // Automatically trigger quality assessment in background
          void defaultQualityAssessmentService
            .assessResult(resultRecord.id, userId, false)
            .catch((e) => console.warn(`[QualityAssessment] Auto-assessment failed for ${resultRecord.id}:`, e));
        }
      }

      await this.jobRepo.updateStatus(jobId, "COMPLETED", 100);
      return savedResults;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[AugmentationService] Job ${jobId} failed:`, err);
      await this.jobRepo.updateStatus(jobId, "FAILED", undefined, errMsg);
      throw err;
    }
  }

  /**
   * Get job status and results
   */
  async getJob(id: string, userId: string): Promise<unknown | null> {
    return this.jobRepo.findByIdAndUserId(id, userId);
  }

  /**
   * Cancel running job
   */
  async cancelJob(id: string, userId: string): Promise<boolean> {
    const job = await this.jobRepo.findByIdAndUserId(id, userId);
    if (!job) return false;

    await this.comfyuiClient.cancelExecution();
    await this.jobRepo.updateStatus(id, "CANCELLED");
    return true;
  }

  /**
   * List available workflows with configuration presets
   */
  async listWorkflows(): Promise<unknown[]> {
    await this.workflowRegistry.loadExternalWorkflows();
    return this.workflowRegistry.listWorkflows().map((wf) => ({
      id: wf.id,
      name: wf.name,
      version: wf.version,
      description: wf.description,
      category: wf.category,
      defaultParameters: wf.defaultParameters,
      recommendedConfig: wf.recommendedConfig,
    }));
  }

  /**
   * Record review decision for a generated variant
   */
  async reviewResult(
    resultId: string,
    decision: "APPROVED" | "REJECTED" | "NEEDS_REVIEW" | "PENDING"
  ): Promise<unknown | null> {
    const existing = await this.resultRepo.findById(resultId);
    if (!existing) return null;
    return this.resultRepo.updateReviewDecision(resultId, decision);
  }

  /**
   * Compare all generated variants for a product across workflows
   */
  async compareProductAugmentations(
    productId: string,
    userId: string
  ): Promise<unknown | null> {
    const product = await this.productRepo.findByIdAndUserId(productId, userId);
    if (!product) return null;

    const results = await this.resultRepo.findByProductId(productId);
    const productImages = (product as unknown as { images?: Array<{ id: string; relativePath: string; maskPath?: string | null }> }).images || [];
    const primaryAsset = productImages[0] || null;

    // Group variants by workflow ID
    const workflowGroups: Record<string, unknown[]> = {};
    for (const res of results) {
      if (!workflowGroups[res.workflowId]) {
        workflowGroups[res.workflowId] = [];
      }
      workflowGroups[res.workflowId].push({
        id: res.id,
        imagePath: res.imagePath,
        thumbnailPath: res.thumbnailPath,
        prompt: res.prompt,
        seed: res.seed ? String(res.seed) : null,
        denoise: res.denoise,
        isComposited: res.isComposited,
        compositionStrategy: res.compositionStrategy,
        reviewDecision: res.reviewDecision,
        createdAt: res.createdAt,
      });
    }

    const workflowSections = Object.entries(workflowGroups).map(([wfId, variants]) => {
      const wfDef = this.workflowRegistry.getWorkflow(wfId);
      return {
        workflowId: wfId,
        workflowName: wfDef?.name ?? wfId,
        category: wfDef?.category ?? "custom",
        variantsCount: variants.length,
        variants,
      };
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        subcategory: product.subcategory,
      },
      originalImage: primaryAsset
        ? {
            id: primaryAsset.id,
            path: primaryAsset.relativePath,
            relativePath: primaryAsset.relativePath,
            maskPath: primaryAsset.maskPath,
          }
        : null,
      variants: results,
      totalVariants: results.length,
      reviewStats: {
        approved: results.filter((r) => r.reviewDecision === "APPROVED").length,
        rejected: results.filter((r) => r.reviewDecision === "REJECTED").length,
        needsReview: results.filter((r) => r.reviewDecision === "NEEDS_REVIEW").length,
        pending: results.filter((r) => r.reviewDecision === "PENDING").length,
      },
      workflows: workflowSections,
    };
  }
}
