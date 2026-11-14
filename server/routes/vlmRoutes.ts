import { Router } from "express";
import { defaultVLMController } from "../controllers/VLMController.ts";
import { asyncErrorWrapper } from "../middleware/asyncErrorWrapper.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

export const vlmRouter = Router();

// Provider discovery & status
vlmRouter.get(
  "/providers",
  asyncErrorWrapper((req, res) => defaultVLMController.getProviders(req, res))
);

// Task A: Original Product Visual Analysis
vlmRouter.post(
  "/analyze-product/:productId",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultVLMController.analyzeProduct(req, res))
);

// Task B: Augmented Image Consistency Assessment
vlmRouter.post(
  "/compare-variant/:resultId",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultVLMController.compareVariant(req, res))
);

// Historical analysis queries
vlmRouter.get(
  "/analyses/product/:productId",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultVLMController.getProductAnalyses(req, res))
);

vlmRouter.get(
  "/analyses/result/:resultId",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultVLMController.getResultAnalyses(req, res))
);
