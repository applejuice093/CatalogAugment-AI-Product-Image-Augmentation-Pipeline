import { prisma } from "../db/prisma.ts";
import type { Prisma } from "@prisma/client";

export class EvaluationRunRepository {
  async create(data: {
    userId: string;
    datasetId?: string;
    name: string;
    encoderName: string;
    encoderDimension: number;
    status: string;
    metrics: Record<string, unknown>;
    config: Record<string, unknown>;
    summary?: string;
    durationMs?: number;
    completedAt?: Date;
  }) {
    return prisma.evaluationRun.create({
      data: {
        userId: data.userId,
        datasetId: data.datasetId,
        name: data.name,
        encoderName: data.encoderName,
        encoderDimension: data.encoderDimension,
        status: data.status,
        metrics: data.metrics as Prisma.InputJsonValue,
        config: data.config as Prisma.InputJsonValue,
        summary: data.summary,
        durationMs: data.durationMs,
        completedAt: data.completedAt,
      },
    });
  }

  async findById(id: string, userId?: string) {
    return prisma.evaluationRun.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.evaluationRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
