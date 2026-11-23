import { Router } from "express";
import multer from "multer";
import { config } from "../config/unifiedConfig.ts";
import { productController } from "../controllers/ProductController.ts";
import { asyncErrorWrapper } from "../middleware/asyncErrorWrapper.ts";
import { requireAuth } from "../middleware/authMiddleware.ts";

export const productRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSizeBytes,
  },
});

// Product CRUD routes
productRouter.get(
  "/",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.listProducts(req, res))
);

productRouter.post(
  "/",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.createProduct(req, res))
);

productRouter.get(
  "/:id",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.getProductById(req, res))
);

productRouter.put(
  "/:id",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.updateProduct(req, res))
);

productRouter.delete(
  "/:id",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.deleteProduct(req, res))
);

productRouter.get(
  "/:id/preview",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.getProductPreview(req, res, "original"))
);

productRouter.get(
  "/:id/mask",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.getProductPreview(req, res, "mask"))
);

productRouter.get(
  "/:id/cutout",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.getProductPreview(req, res, "foreground"))
);

productRouter.get(
  "/:id/foreground",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.getProductPreview(req, res, "foreground"))
);

// Product Image Ingestion & Mask Retrieval
productRouter.post(
  "/:id/images",
  requireAuth,
  upload.single("file"),
  asyncErrorWrapper((req, res) => productController.uploadProductImage(req, res))
);

productRouter.get(
  "/:id/images",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.listProductImages(req, res))
);

productRouter.get(
  "/:id/images/:imageId",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.getProductImageFile(req, res, "original"))
);

productRouter.get(
  "/:id/images/:imageId/mask",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.getProductImageFile(req, res, "mask"))
);

productRouter.get(
  "/:id/images/:imageId/foreground",
  requireAuth,
  asyncErrorWrapper((req, res) => productController.getProductImageFile(req, res, "foreground"))
);
