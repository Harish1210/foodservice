import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      `DATABASE_URL is not set. NODE_ENV=${process.env.NODE_ENV}`
    );
  }
  // HTTP-based Neon driver — ideal for Vercel serverless (no WebSocket pool needed)
  const sql = neon(connectionString);
  const adapter = new PrismaNeonHttp(sql);
  return new PrismaClient({ adapter });
}

// In development, reuse a singleton to avoid too many connections.
// In production (Vercel serverless), each function instance creates its own client.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (global.__prisma ??= createPrismaClient());
