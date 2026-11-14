import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../server/app.ts";

describe("Product Routes Integration Tests", () => {
  it("GET /api/products requires authentication and returns 401 when no session provided", async () => {
    const res = await request(app).get("/api/products");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/products requires authentication and returns 401 when unauthenticated", async () => {
    const res = await request(app).post("/api/products").send({
      name: "Test Runner",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/v1/products route alias is mounted and protected", async () => {
    const res = await request(app).get("/api/v1/products");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/products/:id/images rejects unauthenticated upload", async () => {
    const res = await request(app).post("/api/products/11111111-1111-1111-1111-111111111111/images");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});
