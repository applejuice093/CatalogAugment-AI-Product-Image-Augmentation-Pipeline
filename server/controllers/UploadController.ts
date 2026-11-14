import type { Request, Response } from "express";
import { uploadService, UploadService } from "../services/uploadService.ts";
import { uploadFileValidationSchema, uploadIdParamSchema } from "../validators/upload.schema.ts";
import { BaseController } from "./BaseController.ts";

export class UploadController extends BaseController {
  constructor(private readonly service: UploadService = uploadService) {
    super();
  }

  async listUploads(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }

      const items = await this.service.listUserUploads(req.user.id);
      this.handleSuccess(res, { items });
    } catch (error) {
      this.handleError(error, res, "UploadController.listUploads");
    }
  }

  async getUploadById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }

      const paramResult = uploadIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        this.handleBadRequest(res, "Invalid upload identifier.", paramResult.error.format());
        return;
      }

      const fileResult = await this.service.getUploadFile(req.user.id, paramResult.data.id);
      if (!fileResult) {
        this.handleNotFound(res, "Upload not found.");
        return;
      }

      res.setHeader("Content-Type", fileResult.mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.status(200).send(fileResult.data);
    } catch (error) {
      this.handleError(error, res, "UploadController.getUploadById");
    }
  }

  async createUpload(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        this.handleUnauthorized(res, "Sign in required.");
        return;
      }

      if (!req.file) {
        this.handleBadRequest(res, "Choose an image file.");
        return;
      }

      const validation = uploadFileValidationSchema.safeParse({
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname,
      });

      if (!validation.success) {
        this.handleBadRequest(res, "Invalid image upload.", validation.error.format());
        return;
      }

      const result = await this.service.saveUpload({
        userId: req.user.id,
        originalName: req.file.originalname,
        mime: req.file.mimetype,
        buffer: req.file.buffer,
      });

      this.handleCreated(res, result);
    } catch (error) {
      this.handleError(error, res, "UploadController.createUpload");
    }
  }
}

export const uploadController = new UploadController();
