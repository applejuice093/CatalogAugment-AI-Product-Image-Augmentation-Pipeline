import { z } from "zod";

export const uploadIdParamSchema = z.object({
  id: z.string().uuid("Invalid upload ID format"),
});

export const uploadFileValidationSchema = z.object({
  mimetype: z.enum(["image/jpeg", "image/png", "image/webp"], {
    message: "Only JPEG, PNG, and WebP images are allowed.",
  }),
  size: z
    .number()
    .max(10 * 1024 * 1024, "Image must be under 10 MB.")
    .min(1, "File cannot be empty."),
  originalname: z.string().min(1).max(255),
});

export type UploadIdParam = z.infer<typeof uploadIdParamSchema>;
