import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      `DATABASE_URL is not set. NODE_ENV=${process.env.NODE_ENV}`
    );
  }
  // PrismaNeonHttp takes the connection string directly and calls neon() internally
  const adapter = new PrismaNeonHttp(connectionString);
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
