import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../server/app.ts";

describe("Evaluation Routes Integration Tests", () => {
  it("POST /api/evaluations/run requires authentication (401)", async () => {
    const res = await request(app).post("/api/evaluations/run").send({
      name: "Q4 Experiment",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/evaluations requires authentication (401)", async () => {
    const res = await request(app).get("/api/evaluations");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/evaluations/:id requires authentication (401)", async () => {
    const res = await request(app).get("/api/evaluations/eval-123");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/evaluations/search requires authentication (401)", async () => {
    const res = await request(app).post("/api/evaluations/search").send({});

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/v1/evaluations alias route enforces authentication (401)", async () => {
    const res = await request(app).get("/api/v1/evaluations");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});
