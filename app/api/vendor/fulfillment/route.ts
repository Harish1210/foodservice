import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireVendor() {
  const session = await getSession();
  if (!session || session.role !== "vendor") return null;
  return session;
}

export async function GET() {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const vendor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { supportsDelivery: true, supportsPickup: true },
  });

  return NextResponse.json(vendor ?? { supportsDelivery: true, supportsPickup: true });
}

export async function PATCH(req: NextRequest) {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { supportsDelivery, supportsPickup } = await req.json();

  if (!supportsDelivery && !supportsPickup) {
    return NextResponse.json({ error: "At least one of delivery or pickup must be enabled" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: { supportsDelivery, supportsPickup },
    select: { supportsDelivery: true, supportsPickup: true },
  });

  return NextResponse.json(updated);
}
