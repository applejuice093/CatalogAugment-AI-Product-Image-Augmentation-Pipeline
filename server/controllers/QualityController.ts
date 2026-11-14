import type { Request, Response } from "express";
import {
  defaultQualityAssessmentService,
  QualityAssessmentService,
} from "../services/quality/qualityAssessmentService.ts";
import type { QualityDecision } from "../services/quality/types.ts";
import {
  qualityAssessParamSchema,
  qualityQueueQuerySchema,
  qualityReviewBodySchema,
} from "../validators/quality.schema.ts";
import { BaseController } from "./BaseController.ts";

export class QualityController extends BaseController {
  private qualityService: QualityAssessmentService;

  constructor(qualityService: QualityAssessmentService = defaultQualityAssessmentService) {
    super();
    this.qualityService = qualityService;
  }

  /**
   * Run automated multi-modal quality assessment on a variant
   */
  assessResult = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = qualityAssessParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid result ID", paramCheck.error.format());
    }

    const includeVLM = req.body?.includeVLM !== false;

    try {
      const assessment = await this.qualityService.assessResult(
        paramCheck.data.resultId,
        userId,
        includeVLM
      );
      return this.handleSuccess(res, assessment);
    } catch (err) {
      return this.handleError(err, res, "QualityController.assessResult");
    }
  };

  /**
   * Retrieve existing quality assessment report
   */
  getAssessment = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = qualityAssessParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid result ID", paramCheck.error.format());
    }

    try {
      const assessment = await this.qualityService.getAssessment(
        paramCheck.data.resultId,
        userId
      );
      if (!assessment) {
        return this.handleNotFound(res, "Quality assessment not found for this variant.");
      }
      return this.handleSuccess(res, assessment);
    } catch (err) {
      return this.handleError(err, res, "QualityController.getAssessment");
    }
  };

  /**
   * Submit manual human review decision with audit trail
   */
  submitReview = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = qualityAssessParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid result ID", paramCheck.error.format());
    }

    const bodyCheck = qualityReviewBodySchema.safeParse(req.body);
    if (!bodyCheck.success) {
      return this.handleBadRequest(res, "Invalid review payload", bodyCheck.error.format());
    }

    const decision: QualityDecision =
      bodyCheck.data.decision === "APPROVED" ? "PASS" : (bodyCheck.data.decision as QualityDecision);

    try {
      const result = await this.qualityService.submitManualReview(
        paramCheck.data.resultId,
        userId,
        {
          decision,
          reviewNotes: bodyCheck.data.reviewNotes,
          rejectionReason: bodyCheck.data.rejectionReason,
        }
      );
      return this.handleSuccess(res, result);
    } catch (err) {
      return this.handleError(err, res, "QualityController.submitReview");
    }
  };

  /**
   * Retrieve queue of variants requiring human review
   */
  getReviewQueue = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const queryCheck = qualityQueueQuerySchema.safeParse(req.query);
    const limit = queryCheck.success ? queryCheck.data.limit : 50;
    const offset = queryCheck.success ? queryCheck.data.offset : 0;

    try {
      const queue = await this.qualityService.getReviewQueue(limit, offset);
      return this.handleSuccess(res, { queue, total: queue.length });
    } catch (err) {
      return this.handleError(err, res, "QualityController.getReviewQueue");
    }
  };
}

export const defaultQualityController = new QualityController();
