import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "../server/db/prisma.ts";
import { config } from "../server/config/unifiedConfig.ts";
import { OllamaVLMProvider } from "../server/services/vlm/providers/ollamaProvider.ts";

async function reanalyzeAll() {
  const provider = new OllamaVLMProvider();
  const products = await prisma.product.findMany({
    include: { images: true },
  });

  for (const product of products) {
    const primaryAsset = product.images[0];
    if (!primaryAsset) {
      console.log(`No asset for ${product.name}, skipping`);
      continue;
    }

    const fullPath = path.join(config.storage.uploadRoot, primaryAsset.relativePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${fullPath}`);
      continue;
    }

    console.log(`Analyzing ${product.name} (${product.id})...`);
    const fileBuf = fs.readFileSync(fullPath);
    const startTime = Date.now();
    const analysis = await provider.analyzeProduct(fileBuf, primaryAsset.mime);
    const latency = Date.now() - startTime;

    // Delete old broken analyses for this product
    await prisma.vLMAnalysis.deleteMany({
      where: { productId: product.id },
    });

    // Create fresh clean analysis
    const record = await prisma.vLMAnalysis.create({
      data: {
        productId: product.id,
        taskType: "PRODUCT_ANALYSIS",
        provider: "ollama",
        modelName: "moondream:latest",
        promptVersion: "v2-visual-qa",
        rawOutput: analysis.description,
        normalizedData: analysis as any,
        confidence: analysis.confidence,
        latencyMs: latency,
      },
    });

    console.log(`Created clean VLMAnalysis ${record.id} for ${product.name}:`);
    console.log(JSON.stringify(analysis, null, 2));
  }
}

reanalyzeAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
