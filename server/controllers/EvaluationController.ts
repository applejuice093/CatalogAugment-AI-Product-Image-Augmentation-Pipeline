import type { Request, Response } from "express";
import { prisma } from "../db/prisma.ts";
import { defaultEvaluationService, EvaluationBenchmarkService } from "../services/evaluation/evaluationBenchmarkService.ts";
import { evaluationIdParamSchema, runEvaluationSchema } from "../validators/evaluation.schema.ts";
import { BaseController } from "./BaseController.ts";

export class EvaluationController extends BaseController {
  private evalService: EvaluationBenchmarkService;

  constructor(evalService: EvaluationBenchmarkService = defaultEvaluationService) {
    super();
    this.evalService = evalService;
  }

  runBenchmark = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const bodyCheck = runEvaluationSchema.safeParse(req.body);
    if (!bodyCheck.success) {
      return this.handleBadRequest(res, "Invalid evaluation parameters", bodyCheck.error.format());
    }

    try {
      const report = await this.evalService.runBenchmark(userId, bodyCheck.data);
      return this.handleCreated(res, report);
    } catch (err) {
      return this.handleError(err, res, "EvaluationController.runBenchmark");
    }
  };

  listRuns = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    try {
      const runs = await this.evalService.listRuns(userId);
      return this.handleSuccess(res, { runs, count: runs.length });
    } catch (err) {
      return this.handleError(err, res, "EvaluationController.listRuns");
    }
  };

  getRun = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    const paramCheck = evaluationIdParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      return this.handleBadRequest(res, "Invalid evaluation ID", paramCheck.error.format());
    }

    try {
      const run = await this.evalService.getRun(paramCheck.data.id, userId);
      if (!run) {
        return this.handleNotFound(res, "Evaluation run not found.");
      }
      return this.handleSuccess(res, run);
    } catch (err) {
      return this.handleError(err, res, "EvaluationController.getRun");
    }
  };

  searchCatalog = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    if (!userId) {
      return this.handleUnauthorized(res);
    }

    // Check if query image buffer is passed via file upload (multer) or base64 in body
    let imageBuffer: Buffer | undefined;

    if (req.file?.buffer) {
      imageBuffer = req.file.buffer;
    } else if (typeof req.body?.imageBase64 === "string") {
      imageBuffer = Buffer.from(req.body.imageBase64, "base64");
    }

    if (!imageBuffer) {
      return this.handleBadRequest(
        res,
        "A visual search query image is required (either file upload or imageBase64)."
      );
    }

    const topK = req.body?.topK ? Math.min(20, Math.max(1, Number(req.body.topK))) : 5;
    const startTime = Date.now();

    try {
      const rawResults = await this.evalService.searchCatalog(userId, imageBuffer, topK);
      const latencyMs = Date.now() - startTime;

      // Enrich with product names and SKUs
      const productIds = rawResults.map((r) => r.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true, category: true },
      });
      const prodMap = new Map(products.map((p) => [p.id, p]));

      const results = rawResults.map((r, idx) => {
        const prod = prodMap.get(r.productId);
        return {
          rank: idx + 1,
          productId: r.productId,
          sku: prod?.sku || r.sku,
          name: prod?.name || r.sku || "Catalog Product",
          category: prod?.category || "Apparel",
          score: r.similarityScore,
          similarityScore: r.similarityScore,
          matchType: (r as any).isAugmented ? "Augmented Variant" : "Original Reference",
          imagePath: r.imagePath,
        };
      });

      return this.handleSuccess(res, {
        results,
        queryMatches: results,
        queryMetrics: { latencyMs, topK },
        count: results.length,
      });
    } catch (err) {
      return this.handleError(err, res, "EvaluationController.searchCatalog");
    }
  };
}

export const defaultEvaluationController = new EvaluationController();
