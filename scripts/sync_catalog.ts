import fs from "node:fs";
import path from "node:path";
import { prisma } from "../server/db/prisma.ts";
import { config } from "../server/config/unifiedConfig.ts";
import { productService } from "../server/services/productService.ts";

async function syncCatalog() {
  // 1. Rename the denim shorts product properly so its name matches its picture
  const shorts = await prisma.product.findUnique({
    where: { id: "c7d22c4c-4561-4945-95db-4189615e7b4b" },
  });

  if (shorts) {
    await prisma.product.update({
      where: { id: shorts.id },
      data: {
        name: "Denim Shorts",
        sku: "SHORTS-001",
        category: "Apparel",
        subcategory: "Denim Shorts",
        description: "Classic casual denim shorts with belt-looped waistband and straight-leg cut.",
      },
    });
    console.log("Updated product c7d22c4c-4561-4945-95db-4189615e7b4b to Denim Shorts!");
  }

  // 2. Check if a real Running Shoe product exists
  const existingShoe = await prisma.product.findFirst({
    where: { sku: "SHOE-RUN-002" },
  });

  if (!existingShoe) {
    const user = await prisma.user.findFirst();
    if (user) {
      const shoeProduct = await prisma.product.create({
        data: {
          userId: user.id,
          name: "Performance Sport Runner",
          sku: "SHOE-RUN-002",
          category: "Footwear",
          subcategory: "Running Shoes",
          description: "High-performance athletic running shoe with breathable mesh upper and cushioned sole.",
        },
      });

      console.log(`Created new Performance Sport Runner product: ${shoeProduct.id}`);

      // Ingest the real studio shoe image
      const shoeImgPath = path.resolve("public/images/studio.jpg");
      if (fs.existsSync(shoeImgPath)) {
        const shoeBuf = fs.readFileSync(shoeImgPath);
        const assetResult = await productService.uploadProductImage({
          userId: user.id,
          productId: shoeProduct.id,
          originalName: "studio-shoe.jpg",
          mime: "image/jpeg",
          buffer: shoeBuf,
        });
        console.log(`Ingested shoe asset: ${assetResult.id}, mask: ${assetResult.urls.mask}`);
      }
    }
  }

  console.log("Catalog synchronization complete!");
}

syncCatalog()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
