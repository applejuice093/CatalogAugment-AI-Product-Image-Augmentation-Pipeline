import { z } from "zod";

export const qualityAssessParamSchema = z.object({
  resultId: z.string().min(1, "resultId is required"),
});

export const qualityReviewBodySchema = z.object({
  decision: z.enum(["PASS", "REJECT", "NEEDS_REVIEW", "APPROVED"]),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const qualityQueueQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
