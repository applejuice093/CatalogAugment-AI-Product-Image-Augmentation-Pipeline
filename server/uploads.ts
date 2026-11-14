import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "./db/index.ts";
import { asset } from "./db/schema.ts";
import { auth } from "./auth.ts";

const UPLOAD_ROOT = path.resolve("data/uploads");
const MAX_BYTES = 10 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function insideRoot(filePath: string) {
  const root = UPLOAD_ROOT.endsWith(path.sep) ? UPLOAD_ROOT : UPLOAD_ROOT + path.sep;
  const resolved = path.resolve(filePath);
  return resolved.startsWith(root);
}

export async function requireUser(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return null;
  return session.user;
}

export async function listUploads(userId: string) {
  return db
    .select({
      id: asset.id,
      originalName: asset.originalName,
      mime: asset.mime,
      bytes: asset.bytes,
      createdAt: asset.createdAt,
    })
    .from(asset)
    .where(eq(asset.userId, userId))
    .orderBy(desc(asset.createdAt));
}

export async function saveUpload(userId: string, file: File) {
  const ext = MIME_EXT[file.type];
  if (!ext) {
    return { error: "Use a JPEG, PNG, or WebP image.", status: 415 as const };
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return { error: "Image must be under 10 MB.", status: 413 as const };
  }
  if (!/^[\w-]+$/.test(userId)) {
    return { error: "Invalid account.", status: 400 as const };
  }

  const id = randomUUID();
  const filename = `${id}.${ext}`;
  const dir = path.join(UPLOAD_ROOT, userId);
  const full = path.join(dir, filename);
  if (!insideRoot(full)) {
    return { error: "Invalid path.", status: 400 as const };
  }

  await fs.mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(full, bytes);

  const relativePath = path.posix.join(userId, filename);
  await db.insert(asset).values({
    id,
    userId,
    originalName: path.basename(file.name).slice(0, 180) || filename,
    relativePath,
    mime: file.type,
    bytes: bytes.byteLength,
    createdAt: new Date(),
  });

  return { id, originalName: file.name, bytes: bytes.byteLength };
}

export async function readUpload(userId: string, id: string) {
  if (!/^[\w-]+$/.test(id)) return null;
  const rows = await db.select().from(asset).where(eq(asset.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.userId !== userId) return null;
  if (row.relativePath.includes("..")) return null;

  const full = path.resolve(UPLOAD_ROOT, ...row.relativePath.split("/"));
  if (!insideRoot(full)) return null;
  const data = await fs.readFile(full);
  return { row, data };
}
