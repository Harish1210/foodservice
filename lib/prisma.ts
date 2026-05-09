import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

// Provide WebSocket constructor for Node.js / Vercel serverless (not available natively)
if (typeof WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(`DATABASE_URL environment variable is not set`);
  }
  // Pass the config object directly — PrismaNeon creates its own Pool internally.
  // Do NOT pass a Pool instance here; that was the original bug causing "no host" errors.
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// In development reuse a singleton to avoid exhausting connections.
// In production (Vercel serverless) each function instance gets a fresh client.
export const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (global.__prisma ??= createPrismaClient());
