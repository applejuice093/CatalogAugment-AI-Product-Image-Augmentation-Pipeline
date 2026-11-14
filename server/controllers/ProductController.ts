import type { Request, Response } from "express";
import { productService, ProductService } from "../services/productService.ts";
import {
  createProductSchema,
  productIdParamSchema,
  productImageParamsSchema,
  updateProductSchema,
} from "../validators/product.schema.ts";
import { uploadFileValidationSchema } from "../validators/upload.schema.ts";
import { BaseController } from "./BaseController.ts";

export class ProductController extends BaseController {
  constructor(private readonly service: ProductService = productService) {
    super();
  }

  async listProducts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }
      const products = await this.service.listProducts(req.user.id);
      this.handleSuccess(res, { items: products });
    } catch (error) {
      this.handleError(error, res, "ProductController.listProducts");
    }
  }

  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }
      const paramResult = productIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        this.handleBadRequest(res, "Invalid product identifier.", paramResult.error.format());
        return;
      }
      const product = await this.service.getProduct(req.user.id, paramResult.data.id);
      this.handleSuccess(res, product);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error retrieving product";
      if (message.includes("not found")) {
        this.handleNotFound(res, message);
        return;
      }
      this.handleError(error, res, "ProductController.getProductById");
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }
      const validation = createProductSchema.safeParse(req.body);
      if (!validation.success) {
        this.handleBadRequest(res, "Invalid product payload.", validation.error.format());
        return;
      }
      const product = await this.service.createProduct(req.user.id, validation.data);
      this.handleCreated(res, product);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error creating product";
      if (message.includes("already exists")) {
        this.handleBadRequest(res, message);
        return;
      }
      this.handleError(error, res, "ProductController.createProduct");
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }
      const paramResult = productIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        this.handleBadRequest(res, "Invalid product identifier.", paramResult.error.format());
        return;
      }
      const bodyResult = updateProductSchema.safeParse(req.body);
      if (!bodyResult.success) {
        this.handleBadRequest(res, "Invalid update payload.", bodyResult.error.format());
        return;
      }
      const product = await this.service.updateProduct(req.user.id, paramResult.data.id, bodyResult.data);
      this.handleSuccess(res, product);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error updating product";
      if (message.includes("not found")) {
        this.handleNotFound(res, message);
        return;
      }
      if (message.includes("already exists")) {
        this.handleBadRequest(res, message);
        return;
      }
      this.handleError(error, res, "ProductController.updateProduct");
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }
      const paramResult = productIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        this.handleBadRequest(res, "Invalid product identifier.", paramResult.error.format());
        return;
      }
      await this.service.deleteProduct(req.user.id, paramResult.data.id);
      this.handleSuccess(res, { ok: true, message: "Product deleted successfully." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error deleting product";
      if (message.includes("not found")) {
        this.handleNotFound(res, message);
        return;
      }
      this.handleError(error, res, "ProductController.deleteProduct");
    }
  }

  async uploadProductImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }
      const paramResult = productIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        this.handleBadRequest(res, "Invalid product identifier.", paramResult.error.format());
        return;
      }
      if (!req.file) {
        this.handleBadRequest(res, "Please select an image file to upload.");
        return;
      }
      const fileValidation = uploadFileValidationSchema.safeParse({
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname,
      });
      if (!fileValidation.success) {
        this.handleBadRequest(res, "Invalid image format or size.", fileValidation.error.format());
        return;
      }

      const result = await this.service.uploadProductImage({
        userId: req.user.id,
        productId: paramResult.data.id,
        originalName: req.file.originalname,
        mime: req.file.mimetype,
        buffer: req.file.buffer,
      });

      this.handleCreated(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process image upload";
      if (message.includes("not found")) {
        this.handleNotFound(res, message);
        return;
      }
      if (message.includes("unsupported") || message.includes("dimensions") || message.includes("exceeds")) {
        this.handleBadRequest(res, message);
        return;
      }
      this.handleError(error, res, "ProductController.uploadProductImage");
    }
  }

  async listProductImages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }
      const paramResult = productIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        this.handleBadRequest(res, "Invalid product identifier.", paramResult.error.format());
        return;
      }
      const images = await this.service.listProductImages(req.user.id, paramResult.data.id);
      this.handleSuccess(res, { items: images });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error listing images";
      if (message.includes("not found")) {
        this.handleNotFound(res, message);
        return;
      }
      this.handleError(error, res, "ProductController.listProductImages");
    }
  }

  async getProductImageFile(req: Request, res: Response, type: "original" | "mask" | "foreground"): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }
      const paramResult = productImageParamsSchema.safeParse(req.params);
      if (!paramResult.success) {
        this.handleBadRequest(res, "Invalid route parameters.", paramResult.error.format());
        return;
      }
      const fileData = await this.service.getProductImageFile(
        req.user.id,
        paramResult.data.id,
        paramResult.data.imageId,
        type
      );
      if (!fileData) {
        this.handleNotFound(res, `Requested ${type} image not found.`);
        return;
      }

      res.setHeader("Content-Type", fileData.mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.status(200).send(fileData.data);
    } catch (error) {
      this.handleError(error, res, `ProductController.getProductImageFile.${type}`);
    }
  }
}

export const productController = new ProductController();
