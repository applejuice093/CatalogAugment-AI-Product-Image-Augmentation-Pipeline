import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.ts";
import { authSchema } from "./db/schema.ts";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is required. Copy .env.example to .env.");
}

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:5173";

export const auth = betterAuth({
  secret,
  baseURL,
  trustedOrigins: [baseURL, "http://localhost:5173", "http://127.0.0.1:5173"],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});
