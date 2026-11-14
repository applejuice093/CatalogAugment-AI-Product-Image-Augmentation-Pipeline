import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.ts";
import { augmentationRouter } from "./augmentationRoutes.ts";
import { healthRouter } from "./healthRoutes.ts";
import { productRouter } from "./productRoutes.ts";
import { uploadRouter } from "./uploadRoutes.ts";
import { vlmRouter } from "./vlmRoutes.ts";
import { qualityRouter } from "./qualityRoutes.ts";
import { datasetRouter } from "./datasetRoutes.ts";
import { evaluationRouter } from "./evaluationRoutes.ts";

export const apiRouter = Router();

// Health endpoint
apiRouter.use("/health", healthRouter);

// Product Catalog & Image Ingestion endpoints
apiRouter.use("/products", productRouter);
apiRouter.use("/v1/products", productRouter);

// Augmentation & ComfyUI Generation endpoints
apiRouter.use("/augmentations", augmentationRouter);
apiRouter.use("/v1/augmentations", augmentationRouter);

// Hybrid VLM Product Intelligence endpoints
apiRouter.use("/vlm", vlmRouter);
apiRouter.use("/v1/vlm", vlmRouter);

// Quality Control & Evaluation endpoints
apiRouter.use("/quality", qualityRouter);
apiRouter.use("/v1/quality", qualityRouter);

// Dataset Management & Lineage Export endpoints
apiRouter.use("/datasets", datasetRouter);
apiRouter.use("/v1/datasets", datasetRouter);

// Visual Search & Research Evaluation endpoints
apiRouter.use("/evaluations", evaluationRouter);
apiRouter.use("/v1/evaluations", evaluationRouter);

// General Uploads endpoint
apiRouter.use("/uploads", uploadRouter);

// Better-Auth handler for authentication endpoints in Express 5
apiRouter.use("/auth", toNodeHandler(auth));
