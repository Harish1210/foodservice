import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

// GET /api/admin/vendors — list all vendors (pending and approved)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const vendors = await prisma.user.findMany({
    where: { role: "vendor" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      businessName: true,
      businessAddress: true,
      lat: true,
      lng: true,
      isOpen: true,
      isApproved: true,
      createdAt: true,
      _count: { select: { menuItems: true } },
    },
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ vendors });
}

// PATCH /api/admin/vendors — approve or reject a vendor
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { vendorId, action } = await req.json();
  if (!vendorId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.user.update({
      where: { id: vendorId },
      data: { isApproved: true },
    });
    return NextResponse.json({ success: true, message: "Vendor approved" });
  } else {
    // Reject = delete the vendor account
    await prisma.user.delete({ where: { id: vendorId } });
    return NextResponse.json({ success: true, message: "Vendor rejected and removed" });
  }
}
