import { z } from "zod";

export const createDatasetSchema = z.object({
  name: z.string().min(1, "Dataset name is required").max(100),
  version: z.string().default("1.0.0"),
  description: z.string().optional(),
  splitConfig: z
    .object({
      trainRatio: z.number().min(0.1).max(0.9).default(0.7),
      valRatio: z.number().min(0.05).max(0.5).default(0.15),
      testRatio: z.number().min(0.05).max(0.5).default(0.15),
      randomSeed: z.number().default(42),
      includeOriginals: z.boolean().default(true),
      minQualityScore: z.number().min(0).max(100).default(60),
      onlyApproved: z.boolean().default(false),
    })
    .optional(),
});

export const datasetIdParamSchema = z.object({
  id: z.string().min(1, "Dataset ID is required"),
});
