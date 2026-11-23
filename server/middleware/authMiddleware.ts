import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.ts";
import { prisma } from "../db/prisma.ts";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// In-memory cache mapping session user ID to synchronized Postgres user ID
const syncedUserMap = new Map<string, string>();

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: "Authentication required", statusCode: 401 });
      return;
    }

    const authUser = session.user as AuthenticatedUser;
    req.user = { ...authUser };

    // Synchronize authenticated user to Prisma PostgreSQL to satisfy database foreign keys
    const cachedPostgresId = syncedUserMap.get(authUser.id);
    if (cachedPostgresId) {
      req.user.id = cachedPostgresId;
    } else {
      try {
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { id: authUser.id },
              { email: authUser.email },
            ],
          },
        });

        if (!existing) {
          const created = await prisma.user.create({
            data: {
              id: authUser.id,
              email: authUser.email,
              name: authUser.name || authUser.email.split("@")[0] || "User",
              emailVerified: authUser.emailVerified ?? false,
            },
          });
          req.user.id = created.id;
          syncedUserMap.set(authUser.id, created.id);
        } else {
          req.user.id = existing.id;
          syncedUserMap.set(authUser.id, existing.id);
        }
      } catch (syncError) {
        console.error("Warning: Could not sync user to PostgreSQL database:", syncError);
      }
    }

    next();
  } catch (error) {
    console.error("Auth session retrieval error:", error);
    res.status(401).json({ error: "Authentication validation failed", statusCode: 401 });
  }
}
