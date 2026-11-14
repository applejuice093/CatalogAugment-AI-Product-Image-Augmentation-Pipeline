import { serve } from "@hono/node-server";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { Hono } from "hono";
import { auth } from "./auth.ts";
import { db } from "./db/index.ts";
import { listUploads, readUpload, requireUser, saveUpload } from "./uploads.ts";

migrate(db, { migrationsFolder: "server/db/migrations" });

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/api/uploads", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Sign in required." }, 401);
  const items = await listUploads(user.id);
  return c.json({
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  });
});

app.get("/api/uploads/:id", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Sign in required." }, 401);
  const found = await readUpload(user.id, c.req.param("id"));
  if (!found) return c.json({ error: "Not found." }, 404);
  return new Response(found.data, {
    headers: {
      "Content-Type": found.row.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
});

app.post("/api/uploads", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Sign in required." }, 401);
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: "Choose an image file." }, 400);
  }
  const saved = await saveUpload(user.id, file);
  if ("error" in saved) return c.json({ error: saved.error }, saved.status);
  return c.json(saved, 201);
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
});
