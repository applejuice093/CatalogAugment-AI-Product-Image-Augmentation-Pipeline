import fs from "node:fs";
import path from "node:path";
import { prisma } from "../server/db/prisma.ts";
import { config } from "../server/config/unifiedConfig.ts";
import { applyMaskAsAlpha } from "../server/services/segmentationService.ts";

async function refreshCutouts() {
  const assets = await prisma.asset.findMany();

  for (const asset of assets) {
    if (!asset.relativePath || !asset.maskPath || !asset.foregroundPath) continue;

    const origFullPath = path.join(config.storage.uploadRoot, asset.relativePath);
    const maskFullPath = path.join(config.storage.uploadRoot, asset.maskPath);
    const fgFullPath = path.join(config.storage.uploadRoot, asset.foregroundPath);

    if (fs.existsSync(origFullPath) && fs.existsSync(maskFullPath)) {
      console.log(`Processing cutout for asset ${asset.id} (${asset.originalName})...`);
      const origBuf = fs.readFileSync(origFullPath);
      const maskBuf = fs.readFileSync(maskFullPath);

      const transparentCutout = await applyMaskAsAlpha(origBuf, maskBuf);
      fs.writeFileSync(fgFullPath, transparentCutout);
      console.log(`Updated transparent cutout at ${fgFullPath} (${transparentCutout.length} bytes)`);
    }
  }

  console.log("All cutouts successfully refreshed with true alpha transparency!");
}

refreshCutouts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
