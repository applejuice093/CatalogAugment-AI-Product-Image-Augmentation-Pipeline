import { Router } from "express";
import { AugmentationController } from "../controllers/AugmentationController.ts";
import { asyncErrorWrapper } from "../middleware/asyncErrorWrapper.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

export const augmentationRouter = Router();
const controller = new AugmentationController();

// Workflow definitions
augmentationRouter.get(
  "/workflows",
  asyncErrorWrapper((req, res) => controller.listWorkflows(req, res))
);

// Augmentation Jobs
augmentationRouter.post(
  "/jobs",
  requireAuth,
  asyncErrorWrapper((req, res) => controller.submitJob(req, res))
);

augmentationRouter.get(
  "/jobs/:id",
  requireAuth,
  asyncErrorWrapper((req, res) => controller.getJob(req, res))
);

augmentationRouter.post(
  "/jobs/:id/cancel",
  requireAuth,
  asyncErrorWrapper((req, res) => controller.cancelJob(req, res))
);

// Review Decisions
augmentationRouter.post(
  "/results/:id/review",
  requireAuth,
  asyncErrorWrapper((req, res) => controller.reviewResult(req, res))
);

// Workflow Output Comparison across product variants
augmentationRouter.get(
  "/compare/:productId",
  requireAuth,
  asyncErrorWrapper((req, res) => controller.compareProduct(req, res))
);

// Image Preview / Serving
augmentationRouter.get(
  "/results/:id/image",
  asyncErrorWrapper((req, res) => controller.serveResultImage(req, res))
);
