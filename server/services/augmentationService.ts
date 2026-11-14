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
import { SegmentationService } from "./segmentationService.ts";

export class AugmentationService {
  private comfyuiClient: IComfyUIClient;
  private workflowRegistry: WorkflowRegistry;
  private jobRepo: AugmentationJobRepository;
  private resultRepo: AugmentationResultRepository;
  private productRepo: ProductRepository;
  private assetRepo: AssetRepository;
  private segmentationService: SegmentationService;

  constructor(
    comfyuiClient: IComfyUIClient = defaultComfyUIClient,
    workflowRegistry: WorkflowRegistry = defaultWorkflowRegistry,
    jobRepo: AugmentationJobRepository = new AugmentationJobRepository(),
    resultRepo: AugmentationResultRepository = new AugmentationResultRepository(),
    productRepo: ProductRepository = new ProductRepository(),
    assetRepo: AssetRepository = new AssetRepository(),
    segmentationService: SegmentationService = new SegmentationService()
  ) {
    this.comfyuiClient = comfyuiClient;
    this.workflowRegistry = workflowRegistry;
    this.jobRepo = jobRepo;
    this.resultRepo = resultRepo;
    this.productRepo = productRepo;
    this.assetRepo = assetRepo;
    this.segmentationService = segmentationService;
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
      // Pick the latest image of the product
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
      // Run segmentation on the fly if mask was not previously saved
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

    // 6. Execute Generation Pipeline
    // Run generation asynchronously or inline depending on execution mode
    const executePromise = this.executeGeneration(
      job.id,
      product.id,
      asset.id,
      workflow,
      input,
      inputImagePath,
      maskFullPath
    );

    // If running in development/local with live ComfyUI, await result or return running job
    return {
      job,
      results: await executePromise,
    };
  }

  /**
   * Internal pipeline executing ComfyUI workflow, tracking progress, and saving results
   */
  private async executeGeneration(
    jobId: string,
    productId: string,
    assetId: string,
    workflow: ReturnType<WorkflowRegistry["getWorkflow"]> & object,
    input: CreateAugmentationJobInput,
    inputImagePath: string,
    maskFullPath: string
  ): Promise<unknown[]> {
    try {
      await this.jobRepo.updateStatus(jobId, "PROCESSING", 5);

      // Read image files
      const inputBuffer = await fs.readFile(inputImagePath);
      const maskBuffer = await fs.readFile(maskFullPath);

      // Upload to ComfyUI
      const comfyInputFilename = `input_${jobId}_${Date.now()}.png`;
      const comfyMaskFilename = `mask_${jobId}_${Date.now()}.png`;

      await this.comfyuiClient.uploadImage(inputBuffer, comfyInputFilename);
      await this.comfyuiClient.uploadImage(maskBuffer, comfyMaskFilename);

      await this.jobRepo.updateStatus(jobId, "PROCESSING", 15);

      // Construct Executable Prompt
      const executablePrompt = this.workflowRegistry.buildExecutablePrompt(
        workflow,
        input,
        comfyInputFilename,
        comfyMaskFilename
      );

      // Queue Prompt
      const promptId = await this.comfyuiClient.queuePrompt(executablePrompt, jobId);
      await this.jobRepo.updateStatus(jobId, "PROCESSING", 25, undefined, promptId);

      // Track Execution Progress
      const imageOutputs = await this.comfyuiClient.trackExecution(
        promptId,
        jobId,
        async (progress: AugmentationProgress) => {
          await this.jobRepo.updateProgress(jobId, progress.progressPercent);
        }
      );

      // Download and Persist Generated Variants
      const savedResults: unknown[] = [];
      const outputSubdir = path.join("augmented", new Date().toISOString().slice(0, 10));
      const fullOutputDir = path.join(config.storage.uploadRoot, outputSubdir);
      await fs.mkdir(fullOutputDir, { recursive: true });

      for (let i = 0; i < imageOutputs.length; i++) {
        const output = imageOutputs[i];
        const generatedBuffer = await this.comfyuiClient.downloadImage(output);

        const resultFilename = `aug_${jobId}_${i + 1}_${Date.now()}.png`;
        const resultRelativePath = path
          .join(outputSubdir, resultFilename)
          .replace(/\\/g, "/");
        const resultFullPath = path.join(fullOutputDir, resultFilename);

        await fs.writeFile(resultFullPath, generatedBuffer);

        // Generate thumbnail
        const thumbFilename = `thumb_${resultFilename}`;
        const thumbRelativePath = path
          .join(outputSubdir, thumbFilename)
          .replace(/\\/g, "/");
        const thumbFullPath = path.join(fullOutputDir, thumbFilename);

        await sharp(generatedBuffer)
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
          prompt: input.prompt ?? workflow.defaultParameters.prompt,
          negativePrompt:
            input.negativePrompt ?? workflow.defaultParameters.negativePrompt,
          seed: input.seed ?? workflow.defaultParameters.seed,
          cfg: input.cfg ?? workflow.defaultParameters.cfg,
          steps: input.steps ?? workflow.defaultParameters.steps,
          denoise: input.denoise ?? workflow.defaultParameters.denoise,
          sampler: input.sampler ?? workflow.defaultParameters.sampler,
          workflowId: workflow.id,
          workflowVersion: workflow.version,
          status: "COMPLETED",
          reviewDecision: "PENDING",
        });

        savedResults.push(resultRecord);
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
   * List available workflows
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
}
