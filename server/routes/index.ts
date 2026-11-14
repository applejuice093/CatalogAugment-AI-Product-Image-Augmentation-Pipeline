import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.ts";
import { healthRouter } from "./healthRoutes.ts";
import { uploadRouter } from "./uploadRoutes.ts";

export const apiRouter = Router();

// Health endpoint
apiRouter.use("/health", healthRouter);

// Uploads endpoint
apiRouter.use("/uploads", uploadRouter);

// Better-Auth handler for authentication endpoints in Express 5
apiRouter.use("/auth", toNodeHandler(auth));
