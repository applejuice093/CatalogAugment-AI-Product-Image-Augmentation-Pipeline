import { Router } from "express";
import multer from "multer";
import { config } from "../config/unifiedConfig.ts";
import { defaultEvaluationController } from "../controllers/EvaluationController.ts";
import { asyncErrorWrapper } from "../middleware/asyncErrorWrapper.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

export const evaluationRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSizeBytes,
  },
});

// Run visual search retrieval benchmark across 4 comparative experiments
evaluationRouter.post(
  "/run",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultEvaluationController.runBenchmark(req, res))
);

// List past evaluation benchmark runs
evaluationRouter.get(
  "/",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultEvaluationController.listRuns(req, res))
);

// Retrieve evaluation run report by ID
evaluationRouter.get(
  "/:id",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultEvaluationController.getRun(req, res))
);

// Interactive visual search query against indexed product catalog
evaluationRouter.post(
  "/search",
  requireAuth,
  upload.single("image"),
  asyncErrorWrapper((req, res) => defaultEvaluationController.searchCatalog(req, res))
);
