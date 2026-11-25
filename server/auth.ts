import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { config } from "./config/unifiedConfig.ts";
import { db } from "./db/index.ts";
import { authSchema } from "./db/schema.ts";

export const auth = betterAuth({
  secret: config.auth.secret,
  baseURL: config.auth.baseURL,
  trustedOrigins: [...config.auth.trustedOrigins],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 32,
    }),
  ],
});
