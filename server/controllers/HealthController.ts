import type { Request, Response } from "express";
import { config } from "../config/unifiedConfig.ts";
import { checkDatabaseHealth } from "../db/prisma.ts";
import { checkRedisHealth } from "../queue/connection.ts";
import { BaseController } from "./BaseController.ts";

export class HealthController extends BaseController {
  async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      const [dbHealth, redisHealth] = await Promise.all([
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);

      const isHealthy = true; // Service itself is up; sub-service statuses are detailed below

      this.handleSuccess(res, {
        ok: isHealthy,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        environment: config.server.nodeEnv,
        services: {
          database: dbHealth,
          redis: redisHealth,
        },
      });
    } catch (error) {
      this.handleError(error, res, "HealthController.getHealth");
    }
  }
}

export const healthController = new HealthController();
