import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../server/app.ts";

describe("VLM Routes Integration Tests", () => {
  it("GET /api/vlm/providers returns available provider statuses", async () => {
    const res = await request(app).get("/api/vlm/providers");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("providers");
    expect(Array.isArray(res.body.providers)).toBe(true);

    const providerNames = res.body.providers.map((p: { name: string }) => p.name);
    expect(providerNames).toContain("ollama");
    expect(providerNames).toContain("cloud");
  });

  it("POST /api/vlm/analyze-product/:productId requires authentication (401)", async () => {
    const res = await request(app).post("/api/vlm/analyze-product/prod-123").send({});

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/vlm/compare-variant/:resultId requires authentication (401)", async () => {
    const res = await request(app).post("/api/vlm/compare-variant/res-123").send({});

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/vlm/analyses/product/:productId requires authentication (401)", async () => {
    const res = await request(app).get("/api/vlm/analyses/product/prod-123");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/vlm/analyses/result/:resultId requires authentication (401)", async () => {
    const res = await request(app).get("/api/vlm/analyses/result/res-123");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/v1/vlm/providers alias route responds correctly", async () => {
    const res = await request(app).get("/api/v1/vlm/providers");

    expect(res.status).toBe(200);
    expect(res.body.providers).toBeDefined();
  });
});
