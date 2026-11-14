import { Router } from "express";
import { defaultQualityController } from "../controllers/QualityController.ts";
import { asyncErrorWrapper } from "../middleware/asyncErrorWrapper.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

export const qualityRouter = Router();

// Trigger automated multi-modal quality assessment
qualityRouter.post(
  "/assess/:resultId",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultQualityController.assessResult(req, res))
);

// Retrieve existing quality assessment report
qualityRouter.get(
  "/assessment/:resultId",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultQualityController.getAssessment(req, res))
);

// Submit manual human review decision and audit trail
qualityRouter.post(
  "/review/:resultId",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultQualityController.submitReview(req, res))
);

// Retrieve items requiring manual human review
qualityRouter.get(
  "/queue",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultQualityController.getReviewQueue(req, res))
);
