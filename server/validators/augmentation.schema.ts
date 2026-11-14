import { z } from "zod";

export const createAugmentationJobSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  inputAssetId: z.string().optional(),
  workflowId: z.string().min(1, "Workflow ID is required").default("wf-01-background-replacement"),
  prompt: z.string().max(2000).optional(),
  negativePrompt: z.string().max(1000).optional(),
  seed: z.number().int().optional(),
  steps: z.number().int().min(1).max(100).optional(),
  cfg: z.number().min(1.0).max(30.0).optional(),
  denoise: z.number().min(0.01).max(1.0).optional(),
  sampler: z.string().optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  numVariants: z.number().int().min(1).max(4).default(1),
  preserveOriginalForeground: z.boolean().default(true),
  enableEdgeRefinement: z.boolean().default(true),
});

export type CreateAugmentationJobInput = z.infer<typeof createAugmentationJobSchema>;

export const augmentationJobParamsSchema = z.object({
  id: z.string().min(1, "Job ID is required"),
});

export const productComparisonParamsSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

export const augmentationResultParamsSchema = z.object({
  id: z.string().min(1, "Result ID is required"),
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "NEEDS_REVIEW", "PENDING"]),
  notes: z.string().max(500).optional(),
});

export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
