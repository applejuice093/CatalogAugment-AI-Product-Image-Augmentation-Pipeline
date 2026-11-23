import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { config } from "../config/unifiedConfig.ts";
import { AugmentationResultRepository } from "../repositories/AugmentationResultRepository.ts";
import { AugmentationService } from "../services/augmentationService.ts";
import {
  augmentationJobParamsSchema,
  augmentationResultParamsSchema,
  createAugmentationJobSchema,
  productComparisonParamsSchema,
  reviewDecisionSchema,
} from "../validators/augmentation.schema.ts";
import { BaseController } from "./BaseController.ts";

export class AugmentationController extends BaseController {
  private augmentationService: AugmentationService;
  private resultRepo: AugmentationResultRepository;

  constructor(
    augmentationService: AugmentationService = new AugmentationService(),
    resultRepo: AugmentationResultRepository = new AugmentationResultRepository()
  ) {
    super();
    this.augmentationService = augmentationService;
    this.resultRepo = resultRepo;
  }

  submitJob = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const validation = createAugmentationJobSchema.safeParse(req.body);
    if (!validation.success) {
      return this.handleBadRequest(res, "Invalid job configuration", validation.error.format());
    }

    try {
      const result = await this.augmentationService.submitJob(userId, validation.data);
      return this.handleCreated(res, result);
    } catch (err) {
      return this.handleError(err, res, "AugmentationController.submitJob");
    }
  };

  getJob = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = augmentationJobParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid job ID", paramCheck.error.format());
    }

    try {
      const job = await this.augmentationService.getJob(paramCheck.data.id, userId);
      if (!job) {
        return this.handleNotFound(res, "Augmentation job not found");
      }
      return this.handleSuccess(res, { job, ...job });
    } catch (err) {
      return this.handleError(err, res, "AugmentationController.getJob");
    }
  };

  cancelJob = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = augmentationJobParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid job ID", paramCheck.error.format());
    }

    try {
      const cancelled = await this.augmentationService.cancelJob(paramCheck.data.id, userId);
      if (!cancelled) {
        return this.handleNotFound(res, "Augmentation job not found or cannot be cancelled");
      }
      return this.handleSuccess(res, { cancelled: true, message: "Job cancelled successfully" });
    } catch (err) {
      return this.handleError(err, res, "AugmentationController.cancelJob");
    }
  };

  listWorkflows = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const workflows = await this.augmentationService.listWorkflows();
      return this.handleSuccess(res, { workflows });
    } catch (err) {
      return this.handleError(err, res, "AugmentationController.listWorkflows");
    }
  };

  compareProduct = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = productComparisonParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid product ID", paramCheck.error.format());
    }

    try {
      const comparison = await this.augmentationService.compareProductAugmentations(
        paramCheck.data.productId,
        userId
      );
      if (!comparison) {
        return this.handleNotFound(res, "Product not found or access denied");
      }
      return this.handleSuccess(res, comparison);
    } catch (err) {
      return this.handleError(err, res, "AugmentationController.compareProduct");
    }
  };

  reviewResult = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = augmentationResultParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid result ID", paramCheck.error.format());
    }

    const bodyCheck = reviewDecisionSchema.safeParse(req.body);
    if (!bodyCheck.success) {
      return this.handleBadRequest(res, "Invalid review decision", bodyCheck.error.format());
    }

    try {
      const updated = await this.augmentationService.reviewResult(
        paramCheck.data.id,
        bodyCheck.data.decision
      );
      if (!updated) {
        return this.handleNotFound(res, "Augmentation result not found");
      }
      return this.handleSuccess(res, updated);
    } catch (err) {
      return this.handleError(err, res, "AugmentationController.reviewResult");
    }
  };

  serveResultImage = async (req: Request, res: Response): Promise<void> => {
    const paramCheck = augmentationResultParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      res.status(400).json({ error: "Invalid result ID" });
      return;
    }

    const isThumb = req.query.thumb === "true";

    try {
      const result = await this.resultRepo.findById(paramCheck.data.id);
      if (!result) {
        res.status(404).json({ error: "Augmentation result not found" });
        return;
      }

      const relative = (isThumb && result.thumbnailPath) ? result.thumbnailPath : result.imagePath;
      const fullPath = path.resolve(config.storage.uploadRoot, relative);

      const buffer = await fs.readFile(fullPath);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.send(buffer);
    } catch {
      res.status(404).json({ error: "Image file not found on disk" });
    }
  };
}
