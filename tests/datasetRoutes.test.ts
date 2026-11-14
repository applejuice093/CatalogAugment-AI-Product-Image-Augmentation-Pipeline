import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../server/app.ts";

describe("Dataset Routes Integration Tests", () => {
  it("POST /api/datasets requires authentication (401)", async () => {
    const res = await request(app).post("/api/datasets").send({
      name: "New Test Dataset",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/datasets requires authentication (401)", async () => {
    const res = await request(app).get("/api/datasets");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/datasets/:id requires authentication (401)", async () => {
    const res = await request(app).get("/api/datasets/ds-123");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/datasets/:id/manifest.json requires authentication (401)", async () => {
    const res = await request(app).get("/api/datasets/ds-123/manifest.json");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/datasets/:id/manifest.csv requires authentication (401)", async () => {
    const res = await request(app).get("/api/datasets/ds-123/manifest.csv");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/datasets/:id/export.zip requires authentication (401)", async () => {
    const res = await request(app).get("/api/datasets/ds-123/export.zip");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/v1/datasets alias route enforces authentication (401)", async () => {
    const res = await request(app).get("/api/v1/datasets");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});
