import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "./config/unifiedConfig.ts";
import { prisma } from "./db/prisma.ts";

export const auth = betterAuth({
  secret: config.auth.secret,
  baseURL: config.auth.baseURL,
  trustedOrigins: [...config.auth.trustedOrigins],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});
