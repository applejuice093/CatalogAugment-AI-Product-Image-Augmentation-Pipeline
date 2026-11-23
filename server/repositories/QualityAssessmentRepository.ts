import { prisma } from "../db/prisma.ts";
import type { Prisma } from "@prisma/client";

export class QualityAssessmentRepository {
  async create(data: {
    augmentationResultId: string;
    productId: string;
    foregroundPreservationScore: number;
    perceptualSimilarityScore: number;
    sharpnessScore: number;
    exposureScore: number;
    vlmConsistencyScore?: number;
    compositeScore: number;
    decision: string;
    signals: Record<string, unknown>;
  }) {
    return prisma.qualityAssessment.create({
      data: {
        augmentationResultId: data.augmentationResultId,
        productId: data.productId,
        foregroundPreservationScore: data.foregroundPreservationScore,
        perceptualSimilarityScore: data.perceptualSimilarityScore,
        sharpnessScore: data.sharpnessScore,
        exposureScore: data.exposureScore,
        vlmConsistencyScore: data.vlmConsistencyScore,
        compositeScore: data.compositeScore,
        decision: data.decision,
        signals: data.signals as Prisma.InputJsonValue,
      },
    });
  }

  async findById(id: string) {
    return prisma.qualityAssessment.findUnique({
      where: { id },
      include: {
        augmentationResult: true,
      },
    });
  }

  async findByResultId(augmentationResultId: string) {
    return prisma.qualityAssessment.findUnique({
      where: { augmentationResultId },
      include: {
        augmentationResult: true,
      },
    });
  }

  async findByProductId(productId: string) {
    return prisma.qualityAssessment.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findReviewQueue(limit = 50, offset = 0) {
    return prisma.qualityAssessment.findMany({
      where: {
        decision: { in: ["NEEDS_REVIEW", "REJECT", "PENDING"] },
      },
      include: {
        augmentationResult: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async updateReview(
    id: string,
    data: {
      decision: string;
      reviewerId: string;
      reviewNotes?: string;
      rejectionReason?: string;
    }
  ) {
    return prisma.qualityAssessment.update({
      where: { id },
      data: {
        decision: data.decision,
        reviewerId: data.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes,
        rejectionReason: data.rejectionReason,
      },
      include: {
        augmentationResult: true,
      },
    });
  }
}
