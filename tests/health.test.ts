import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../server/app.ts";

describe("Health API Integration Tests", () => {
  it("GET /api/health returns 200 and system health payload", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptimeSeconds");
    expect(res.body).toHaveProperty("services");
    expect(res.body.services).toHaveProperty("database");
    expect(res.body.services).toHaveProperty("redis");
  });

  it("GET /api/non-existent returns 404", async () => {
    const res = await request(app).get("/api/non-existent-endpoint");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "Endpoint not found");
  });
});
