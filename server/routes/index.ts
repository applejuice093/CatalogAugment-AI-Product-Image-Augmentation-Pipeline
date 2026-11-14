import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.ts";
import { augmentationRouter } from "./augmentationRoutes.ts";
import { healthRouter } from "./healthRoutes.ts";
import { productRouter } from "./productRoutes.ts";
import { uploadRouter } from "./uploadRoutes.ts";
import { vlmRouter } from "./vlmRoutes.ts";

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

// General Uploads endpoint
apiRouter.use("/uploads", uploadRouter);

// Better-Auth handler for authentication endpoints in Express 5
apiRouter.use("/auth", toNodeHandler(auth));
