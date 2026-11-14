import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.ts";
import { healthRouter } from "./healthRoutes.ts";
import { productRouter } from "./productRoutes.ts";
import { uploadRouter } from "./uploadRoutes.ts";

export const apiRouter = Router();

// Health endpoint
apiRouter.use("/health", healthRouter);

// Product Catalog & Image Ingestion endpoints
apiRouter.use("/products", productRouter);
apiRouter.use("/v1/products", productRouter);

// General Uploads endpoint
apiRouter.use("/uploads", uploadRouter);

// Better-Auth handler for authentication endpoints in Express 5
apiRouter.use("/auth", toNodeHandler(auth));
