import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(180, "Product name cannot exceed 180 characters"),
  sku: z.string().trim().max(64).optional(),
  category: z.string().trim().max(80).optional(),
  subcategory: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamSchema = z.object({
  id: z.string().uuid("Invalid product ID format"),
});

export const productImageParamsSchema = z.object({
  id: z.string().uuid("Invalid product ID format"),
  imageId: z.string().uuid("Invalid image ID format"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type ProductImageParams = z.infer<typeof productImageParamsSchema>;
