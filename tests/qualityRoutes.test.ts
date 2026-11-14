import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../server/app.ts";

describe("Quality Routes Integration Tests", () => {
  it("POST /api/quality/assess/:resultId requires authentication (401)", async () => {
    const res = await request(app).post("/api/quality/assess/res-123").send({});

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/quality/assessment/:resultId requires authentication (401)", async () => {
    const res = await request(app).get("/api/quality/assessment/res-123");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/quality/review/:resultId requires authentication (401)", async () => {
    const res = await request(app).post("/api/quality/review/res-123").send({
      decision: "APPROVED",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/quality/queue requires authentication (401)", async () => {
    const res = await request(app).get("/api/quality/queue");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/v1/quality/queue alias route enforces authentication (401)", async () => {
    const res = await request(app).get("/api/v1/quality/queue");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});
