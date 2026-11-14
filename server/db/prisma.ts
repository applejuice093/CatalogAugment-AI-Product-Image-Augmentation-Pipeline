import { PrismaClient } from "@prisma/client";
import { config } from "../config/unifiedConfig.ts";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: config.database.url,
      },
    },
    log: config.server.isTest ? [] : config.server.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });

if (config.server.nodeEnv !== "production") {
  global.__prisma = prisma;
}

export async function checkDatabaseHealth(): Promise<{ status: "connected" | "disconnected"; latencyMs?: number; error?: string }> {
  if (config.server.isTest) {
    return { status: "disconnected", error: "Test environment (mocked offline)" };
  }

  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "connected", latencyMs: Date.now() - start };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database connection error";
    return { status: "disconnected", error: message };
  }
}
