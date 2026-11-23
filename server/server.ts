import http from "node:http";
import { app } from "./app.ts";
import { config } from "./config/unifiedConfig.ts";
import { prisma } from "./db/prisma.ts";
import { redisConnection } from "./queue/connection.ts";

// Handle Prisma BigInt serialization in JSON.stringify / express res.json
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

const server = http.createServer(app);

server.listen(config.server.port, config.server.host, () => {
  console.log(`🚀 CatalogAugment API server running on http://${config.server.host}:${config.server.port}`);
  console.log(`📡 Environment: ${config.server.nodeEnv}`);
});

async function shutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);

  server.close(async () => {
    console.log("🔒 HTTP server closed.");

    try {
      await prisma.$disconnect();
      console.log("💾 Prisma client disconnected.");
    } catch (e) {
      console.error("Error disconnecting Prisma:", e);
    }

    try {
      redisConnection.disconnect();
      console.log("⚡ Redis connection disconnected.");
    } catch (e) {
      console.error("Error disconnecting Redis:", e);
    }

    process.exit(0);
  });

  // Force close after 10 seconds if lingering
  setTimeout(() => {
    console.error("⚠️ Forcefully shutting down after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
