import { z } from "zod";

export const productAnalysisSchema = z.object({
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().default("general"),
  dominantColors: z.array(z.string()).min(1, "At least one color required"),
  identifiableMaterials: z.array(z.string()).default([]),
  distinctiveAttributes: z.array(z.string()).default([]),
  description: z.string().min(1, "Description is required"),
  searchTags: z.array(z.string()).default([]),
  uncertainAttributes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.85),
});

export const imageConsistencySchema = z.object({
  isSameProduct: z.boolean(),
  identityPreservationScore: z.number().min(0).max(100),
  colorPreservation: z.string().default("preserved"),
  shapePreservation: z.string().default("preserved"),
  designPreservation: z.string().default("preserved"),
  visibleArtifacts: z.array(z.string()).default([]),
  reviewRecommendation: z.enum(["APPROVED", "REJECTED", "NEEDS_REVIEW"]),
  assessmentNotes: z.string().default(""),
});

export const analyzeProductParamsSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

export const compareVariantParamsSchema = z.object({
  resultId: z.string().min(1, "Result ID is required"),
});
