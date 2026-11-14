import type { Request, Response } from "express";
import { DatasetService, defaultDatasetService } from "../services/dataset/datasetService.ts";
import { createDatasetSchema, datasetIdParamSchema } from "../validators/dataset.schema.ts";
import { BaseController } from "./BaseController.ts";

export class DatasetController extends BaseController {
  private datasetService: DatasetService;

  constructor(datasetService: DatasetService = defaultDatasetService) {
    super();
    this.datasetService = datasetService;
  }

  createDataset = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const bodyCheck = createDatasetSchema.safeParse(req.body);
    if (!bodyCheck.success) {
      return this.handleBadRequest(res, "Invalid dataset parameters", bodyCheck.error.format());
    }

    try {
      const result = await this.datasetService.createDataset(userId, bodyCheck.data);
      return this.handleCreated(res, result);
    } catch (err) {
      return this.handleError(err, res, "DatasetController.createDataset");
    }
  };

  listDatasets = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    try {
      const datasets = await this.datasetService.listDatasets(userId);
      return this.handleSuccess(res, { datasets, count: datasets.length });
    } catch (err) {
      return this.handleError(err, res, "DatasetController.listDatasets");
    }
  };

  getDataset = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = datasetIdParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid dataset ID", paramCheck.error.format());
    }

    try {
      const dataset = await this.datasetService.getDataset(paramCheck.data.id, userId);
      if (!dataset) {
        return this.handleNotFound(res, "Dataset not found.");
      }
      return this.handleSuccess(res, dataset);
    } catch (err) {
      return this.handleError(err, res, "DatasetController.getDataset");
    }
  };

  getJsonManifest = async (req: Request, res: Response): Promise<Response | void> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = datasetIdParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid dataset ID", paramCheck.error.format());
    }

    try {
      const json = await this.datasetService.getJsonManifest(paramCheck.data.id, userId);
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="manifest-${paramCheck.data.id}.json"`
      );
      res.send(json);
    } catch (err) {
      return this.handleError(err, res, "DatasetController.getJsonManifest");
    }
  };

  getCsvManifest = async (req: Request, res: Response): Promise<Response | void> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = datasetIdParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid dataset ID", paramCheck.error.format());
    }

    try {
      const csv = await this.datasetService.getCsvManifest(paramCheck.data.id, userId);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="manifest-${paramCheck.data.id}.csv"`
      );
      res.send(csv);
    } catch (err) {
      return this.handleError(err, res, "DatasetController.getCsvManifest");
    }
  };

  exportZip = async (req: Request, res: Response): Promise<Response | void> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = datasetIdParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid dataset ID", paramCheck.error.format());
    }

    try {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="dataset-${paramCheck.data.id}.zip"`
      );
      await this.datasetService.exportZip(paramCheck.data.id, userId, res);
    } catch (err) {
      return this.handleError(err, res, "DatasetController.exportZip");
    }
  };

  deleteDataset = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = datasetIdParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid dataset ID", paramCheck.error.format());
    }

    try {
      await this.datasetService.deleteDataset(paramCheck.data.id, userId);
      return this.handleSuccess(res, { deleted: true });
    } catch (err) {
      return this.handleError(err, res, "DatasetController.deleteDataset");
    }
  };
}

export const defaultDatasetController = new DatasetController();
