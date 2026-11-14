import { Router } from "express";
import multer from "multer";
import { uploadController } from "../controllers/UploadController.ts";
import { asyncErrorWrapper } from "../middleware/asyncErrorWrapper.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";
import { config } from "../config/unifiedConfig.ts";

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSizeBytes,
  },
});

uploadRouter.get(
  "/",
  requireAuth,
  asyncErrorWrapper((req, res) => uploadController.listUploads(req, res))
);

uploadRouter.get(
  "/:id",
  requireAuth,
  asyncErrorWrapper((req, res) => uploadController.getUploadById(req, res))
);

uploadRouter.post(
  "/",
  requireAuth,
  upload.single("file"),
  asyncErrorWrapper((req, res) => uploadController.createUpload(req, res))
);
