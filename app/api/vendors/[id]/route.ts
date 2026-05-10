import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const vendor = await prisma.user.findUnique({
      where: { id, role: "vendor", isApproved: true },
      select: {
        id: true,
        businessName: true,
        firstName: true,
        lastName: true,
        businessAddress: true,
        isOpen: true,
        supportsDelivery: true,
        supportsPickup: true,
      },
    });
    if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ vendor });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
