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
  COMFYUI_URL: z.string().default("http://127.0.0.1:8188"),
  COMFYUI_WS_URL: z.string().default("ws://127.0.0.1:8188/ws"),
  COMFYUI_WORKFLOWS_PATH: z.string().default("C:/A/ComfyUI_windows_portable/ComfyUI/user/default/workflows"),
  COMFYUI_CHECKPOINT: z.string().default("waiIllustriousSDXL_v170.safetensors"),
  COMFYUI_TIMEOUT_MS: z.coerce.number().default(180000),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_VISION_MODEL: z.string().default("moondream"),
  VLM_PROVIDER: z.enum(["auto", "ollama", "cloud", "mock"]).default("auto"),
  VLM_CLOUD_API_KEY: z.string().optional().default(""),
  VLM_CLOUD_MODEL: z.string().default("gemini-1.5-flash"),
  VLM_TIMEOUT_MS: z.coerce.number().default(60000),
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
  comfyui: {
    baseUrl: env.COMFYUI_URL,
    wsUrl: env.COMFYUI_WS_URL,
    workflowsPath: env.COMFYUI_WORKFLOWS_PATH,
    checkpoint: env.COMFYUI_CHECKPOINT,
    timeoutMs: env.COMFYUI_TIMEOUT_MS,
  },
  vlm: {
    ollamaBaseUrl: env.OLLAMA_BASE_URL,
    ollamaModel: env.OLLAMA_VISION_MODEL,
    defaultProvider: env.VLM_PROVIDER,
    cloudApiKey: env.VLM_CLOUD_API_KEY,
    cloudModel: env.VLM_CLOUD_MODEL,
    timeoutMs: env.VLM_TIMEOUT_MS,
  },
} as const;

export type AppConfig = typeof config;
