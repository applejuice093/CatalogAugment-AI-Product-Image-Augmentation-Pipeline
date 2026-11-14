import type { Request, Response } from "express";
import { VLMService, defaultVLMService } from "../services/vlm/vlmService.ts";
import {
  analyzeProductParamsSchema,
  compareVariantParamsSchema,
} from "../validators/vlm.schema.ts";
import { BaseController } from "./BaseController.ts";

export class VLMController extends BaseController {
  private vlmService: VLMService;

  constructor(vlmService: VLMService = defaultVLMService) {
    super();
    this.vlmService = vlmService;
  }

  analyzeProduct = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = analyzeProductParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid product ID", paramCheck.error.format());
    }

    const preferredProvider = (req.body as { preferredProvider?: string })?.preferredProvider;

    try {
      const result = await this.vlmService.analyzeProduct(
        paramCheck.data.productId,
        userId,
        preferredProvider
      );
      return this.handleSuccess(res, result);
    } catch (err) {
      return this.handleError(err, res, "VLMController.analyzeProduct");
    }
  };

  compareVariant = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = compareVariantParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid result ID", paramCheck.error.format());
    }

    const preferredProvider = (req.body as { preferredProvider?: string })?.preferredProvider;

    try {
      const result = await this.vlmService.compareAugmentationVariant(
        paramCheck.data.resultId,
        userId,
        preferredProvider
      );
      return this.handleSuccess(res, result);
    } catch (err) {
      return this.handleError(err, res, "VLMController.compareVariant");
    }
  };

  getProductAnalyses = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = analyzeProductParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid product ID", paramCheck.error.format());
    }

    try {
      const analyses = await this.vlmService.getProductAnalyses(
        paramCheck.data.productId,
        userId
      );
      return this.handleSuccess(res, { analyses });
    } catch (err) {
      return this.handleError(err, res, "VLMController.getProductAnalyses");
    }
  };

  getResultAnalyses = async (req: Request, res: Response): Promise<Response> => {
    const paramCheck = compareVariantParamsSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid result ID", paramCheck.error.format());
    }

    try {
      const analyses = await this.vlmService.getResultAnalyses(paramCheck.data.resultId);
      return this.handleSuccess(res, { analyses });
    } catch (err) {
      return this.handleError(err, res, "VLMController.getResultAnalyses");
    }
  };

  getProviders = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const providers = await this.vlmService.getProvidersStatus();
      return this.handleSuccess(res, { providers });
    } catch (err) {
      return this.handleError(err, res, "VLMController.getProviders");
    }
  };
}

export const defaultVLMController = new VLMController();
