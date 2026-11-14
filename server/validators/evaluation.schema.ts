import { z } from "zod";

export const runEvaluationSchema = z.object({
  name: z.string().min(1, "Evaluation name is required").max(100),
  datasetId: z.string().optional(),
  topK: z.coerce.number().min(1).max(50).default(5),
});

export const evaluationIdParamSchema = z.object({
  id: z.string().min(1, "Evaluation ID is required"),
});
