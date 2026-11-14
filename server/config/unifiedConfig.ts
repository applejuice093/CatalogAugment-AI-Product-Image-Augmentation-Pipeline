import path from "node:path";
import { z } from "zod";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // .env file might be absent or already loaded via CLI
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "production", "test"]).default(
    process.env.NODE_ENV === "test" ? "test" : "development"
  ),
  DATABASE_URL: z
    .string()
    .default("postgresql://catalogaugment:catalogaugment@localhost:5432/catalogaugment?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(1, "BETTER_AUTH_SECRET is required")
    .default(process.env.NODE_ENV === "test" ? "test-auth-secret-for-ci-and-testing-32chars" : ""),
  BETTER_AUTH_URL: z.string().default("http://localhost:5173"),
  UPLOAD_DIR: z.string().default("data/uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables configuration:", parsedEnv.error.format());
  throw new Error("Invalid environment configuration. Check your .env file.");
}

const env = parsedEnv.data;

export const config = {
  server: {
    port: env.PORT,
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    corsOrigins: [
      env.BETTER_AUTH_URL,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ],
  },
  auth: {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [
      env.BETTER_AUTH_URL,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
  },
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  storage: {
    uploadRoot: path.resolve(env.UPLOAD_DIR),
    maxFileSizeBytes: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    allowedMimes: ["image/jpeg", "image/png", "image/webp"] as const,
    mimeExtensionMap: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    } as Record<string, string>,
  },
} as const;

export type AppConfig = typeof config;
