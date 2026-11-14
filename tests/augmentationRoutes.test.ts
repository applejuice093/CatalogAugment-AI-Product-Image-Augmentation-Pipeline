import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../server/app.ts";

describe("Augmentation Routes Integration Tests", () => {
  it("GET /api/augmentations/workflows returns available workflow definitions", async () => {
    const res = await request(app).get("/api/augmentations/workflows");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("workflows");
    expect(Array.isArray(res.body.workflows)).toBe(true);
    expect(res.body.workflows.length).toBeGreaterThanOrEqual(3);

    const wf01 = res.body.workflows.find(
      (w: { id: string }) => w.id === "wf-01-background-replacement"
    );
    expect(wf01).toBeDefined();
    expect(wf01.name).toContain("WF-01");
  });

  it("POST /api/augmentations/jobs requires authentication (401 unauthenticated)", async () => {
    const res = await request(app).post("/api/augmentations/jobs").send({
      productId: "test-product-id",
      workflowId: "wf-01-background-replacement",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/augmentations/jobs/:id requires authentication (401)", async () => {
    const res = await request(app).get("/api/augmentations/jobs/job-123");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/augmentations/jobs/:id/cancel requires authentication (401)", async () => {
    const res = await request(app).post("/api/augmentations/jobs/job-123/cancel");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/augmentations/results/:id/review requires authentication (401)", async () => {
    const res = await request(app).post("/api/augmentations/results/res-123/review").send({
      decision: "APPROVED",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/v1/augmentations/workflows route alias functions correctly", async () => {
    const res = await request(app).get("/api/v1/augmentations/workflows");

    expect(res.status).toBe(200);
    expect(res.body.workflows).toBeDefined();
  });
});
