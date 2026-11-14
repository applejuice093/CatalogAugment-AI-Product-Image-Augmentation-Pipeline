import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../src/lib/api.ts";

describe("Workspace API Client (Phase 9)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should query system health endpoint correctly", async () => {
    const mockHealth = {
      ok: true,
      timestamp: new Date().toISOString(),
      uptimeSeconds: 120,
      environment: "test",
      services: { database: true, redis: false },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as Response);

    const res = await api.getHealth();
    expect(res.ok).toBe(true);
    expect(res.services.database).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
        credentials: "include",
      })
    );
  });

  it("should list products from /api/products", async () => {
    const mockProducts = {
      products: [
        {
          id: "prod-1",
          name: "Test Running Shoe",
          sku: "SHOE-001",
          category: "Footwear",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProducts,
    } as Response);

    const res = await api.getProducts();
    expect(res.products).toHaveLength(1);
    expect(res.products[0].sku).toBe("SHOE-001");
  });

  it("should submit augmentation job to /api/augmentations/jobs", async () => {
    const mockJob = {
      job: {
        id: "job-101",
        productId: "prod-1",
        workflowId: "WF-01",
        workflowVersion: "1.0.0",
        status: "QUEUED",
        progress: 0,
        createdAt: new Date().toISOString(),
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockJob,
    } as Response);

    const res = await api.submitJob({
      productId: "prod-1",
      workflowId: "WF-01",
      prompt: "pedestal shot",
      batchSize: 2,
    });

    expect(res.job.id).toBe("job-101");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/augmentations/jobs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          productId: "prod-1",
          workflowId: "WF-01",
          prompt: "pedestal shot",
          batchSize: 2,
        }),
      })
    );
  });

  it("should handle error responses properly with descriptive error messages", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "Validation failed on SKU parameter" }),
    } as Response);

    await expect(
      api.createProduct({ name: "" })
    ).rejects.toThrow("Validation failed on SKU parameter");
  });
});
