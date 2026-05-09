import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireVendor() {
  const session = await getSession();
  if (!session || session.role !== "vendor") return null;
  return session;
}

export const DEFAULT_HOURS = {
  mon: { isOpen: true,  open: "09:00", close: "21:00" },
  tue: { isOpen: true,  open: "09:00", close: "21:00" },
  wed: { isOpen: true,  open: "09:00", close: "21:00" },
  thu: { isOpen: true,  open: "09:00", close: "21:00" },
  fri: { isOpen: true,  open: "09:00", close: "22:00" },
  sat: { isOpen: true,  open: "10:00", close: "22:00" },
  sun: { isOpen: false, open: "10:00", close: "20:00" },
  override: null as "open" | "closed" | null,
};

export async function GET() {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const vendor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { openingHours: true, isOpen: true },
  });

  let hours = DEFAULT_HOURS;
  if (vendor?.openingHours) {
    try { hours = { ...DEFAULT_HOURS, ...JSON.parse(vendor.openingHours) }; } catch { /* use defaults */ }
  }

  return NextResponse.json({ hours, isOpen: vendor?.isOpen ?? true });
}

export async function PATCH(req: NextRequest) {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { hours, isOpen } = body;

  const updates: Record<string, unknown> = {};
  if (hours !== undefined) updates.openingHours = JSON.stringify(hours);
  if (typeof isOpen === "boolean") updates.isOpen = isOpen;

  await prisma.user.update({
    where: { id: session.userId },
    data: updates,
  });

  return NextResponse.json({ ok: true });
}
