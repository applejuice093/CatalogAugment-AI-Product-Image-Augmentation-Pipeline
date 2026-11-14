import { Router } from "express";
import { defaultDatasetController } from "../controllers/DatasetController.ts";
import { asyncErrorWrapper } from "../middleware/asyncErrorWrapper.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

export const datasetRouter = Router();

// Create new versioned catalog dataset with SKU-level splitting
datasetRouter.post(
  "/",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultDatasetController.createDataset(req, res))
);

// List datasets created by current user
datasetRouter.get(
  "/",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultDatasetController.listDatasets(req, res))
);

// Retrieve dataset details and item count
datasetRouter.get(
  "/:id",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultDatasetController.getDataset(req, res))
);

// Download JSON manifest
datasetRouter.get(
  "/:id/manifest.json",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultDatasetController.getJsonManifest(req, res))
);

// Download CSV manifest
datasetRouter.get(
  "/:id/manifest.csv",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultDatasetController.getCsvManifest(req, res))
);

// Download complete dataset as streaming ZIP archive
datasetRouter.get(
  "/:id/export.zip",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultDatasetController.exportZip(req, res))
);

// Delete dataset
datasetRouter.delete(
  "/:id",
  requireAuth,
  asyncErrorWrapper((req, res) => defaultDatasetController.deleteDataset(req, res))
);
