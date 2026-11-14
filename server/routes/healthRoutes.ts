import { Router } from "express";
import { healthController } from "../controllers/HealthController.ts";
import { asyncErrorWrapper } from "../middleware/asyncErrorWrapper.ts";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncErrorWrapper((req, res) => healthController.getHealth(req, res))
);
