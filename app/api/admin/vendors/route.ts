import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

// GET /api/admin/vendors — list all vendors (pending, on-hold, approved)
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
      isOnHold: true,
      createdAt: true,
      _count: { select: { menuItems: true } },
    },
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ vendors });
}

// PATCH /api/admin/vendors — manage vendor status
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { vendorId, action } = await req.json();
  const validActions = ["approve", "disapprove", "hold", "unhold", "delete"];
  if (!vendorId || !validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    switch (action) {
      case "approve": {
        const vendor = await prisma.user.update({
          where: { id: vendorId },
          data:  { isApproved: true, isOnHold: false },
          select: { firstName: true, businessName: true, phone: true },
        });
        // SMS the vendor to let them know they're live
        if (vendor.phone) {
          const name    = vendor.businessName ?? vendor.firstName ?? "Chef";
          const message =
            `🎉 Congratulations ${name}! Your kitchen has been approved on Dishly.\n\n` +
            `You can now log in and start adding your menu items:\n` +
            `https://foodservice-ruddy.vercel.app/login?role=vendor\n\n` +
            `Once your menu is ready, customers can start ordering. Welcome aboard! 🍽️`;
          sendSMS(vendor.phone, message).catch(() => {});
        }
        return NextResponse.json({ success: true, message: "Vendor approved" });
      }

      case "disapprove":
        await prisma.user.update({
          where: { id: vendorId },
          data: { isApproved: false, isOnHold: false },
        });
        return NextResponse.json({ success: true, message: "Vendor approval revoked" });

      case "hold":
        await prisma.user.update({
          where: { id: vendorId },
          data: { isOnHold: true },
        });
        return NextResponse.json({ success: true, message: "Vendor put on hold" });

      case "unhold":
        await prisma.user.update({
          where: { id: vendorId },
          data: { isOnHold: false },
        });
        return NextResponse.json({ success: true, message: "Vendor hold removed" });

      case "delete":
        await prisma.user.delete({ where: { id: vendorId } });
        return NextResponse.json({ success: true, message: "Vendor permanently deleted" });
    }
  } catch (err) {
    console.error("Admin vendor action error:", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}