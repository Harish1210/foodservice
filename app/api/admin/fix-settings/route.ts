import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** One-time endpoint to update BusinessSettings to Dishly branding.
 *  GET /api/admin/fix-settings
 */
export async function GET() {
  const updated = await prisma.businessSettings.updateMany({
    data: {
      name: "Dishly",
      tagline: "Every dish, every kitchen, delivered",
      email: "hello@homefoodservice.com.au",
    },
  });
  return NextResponse.json({ success: true, count: updated.count });
}
