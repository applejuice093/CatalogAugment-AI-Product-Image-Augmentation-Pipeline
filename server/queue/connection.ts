import { Queue } from "bullmq";
import Redis from "ioredis";
import { config } from "../config/unifiedConfig.ts";

export const redisConnection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  autoResubscribe: false,
  autoResendUnfulfilledCommands: false,
  reconnectOnError: () => false,
  retryStrategy(times) {
    if (config.server.isTest || (times > 1 && config.server.nodeEnv === "development")) {
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

redisConnection.on("error", (err) => {
  if (config.server.isTest || config.server.nodeEnv === "development") {
    return;
  }
  console.error("Redis connection error:", err.message);
});

// Primary task queues required by the augmentation pipeline (lazy initialized)
export const imagePreprocessingQueue = new Queue("image-preprocessing", {
  connection: redisConnection,
});
imagePreprocessingQueue.on("error", () => {});

export const imageGenerationQueue = new Queue("image-generation", {
  connection: redisConnection,
});
imageGenerationQueue.on("error", () => {});

export const vlmAnalysisQueue = new Queue("vlm-analysis", {
  connection: redisConnection,
});
vlmAnalysisQueue.on("error", () => {});

export async function checkRedisHealth(): Promise<{ status: "connected" | "disconnected"; latencyMs?: number; error?: string }> {
  if (config.server.isTest) {
    return { status: "disconnected", error: "Test environment (mocked offline)" };
  }

  const start = Date.now();
  try {
    if (redisConnection.status === "end" || redisConnection.status === "close") {
      return { status: "disconnected", error: "Redis is offline" };
    }
    if (redisConnection.status !== "ready" && redisConnection.status !== "connecting") {
      await redisConnection.connect().catch((e) => {
        throw e;
      });
    }
    await redisConnection.ping();
    return { status: "connected", latencyMs: Date.now() - start };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Redis is unreachable";
    return { status: "disconnected", error: message };
  }
}
