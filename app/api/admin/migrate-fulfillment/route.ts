import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** One-time: adds supportsDelivery / supportsPickup columns to User table.
 *  GET /api/admin/migrate-fulfillment
 */
export async function GET() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "supportsDelivery" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "supportsPickup"   BOOLEAN NOT NULL DEFAULT true;
  `);
  return NextResponse.json({ success: true });
}
