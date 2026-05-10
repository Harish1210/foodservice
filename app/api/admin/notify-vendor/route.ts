/** ONE-TIME — sends approval SMS to a vendor by name. Delete after use. */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "Vinoda";
  try {
    const vendor = await prisma.user.findFirst({
      where: {
        role: "vendor",
        OR: [
          { firstName: { contains: name, mode: "insensitive" } },
          { businessName: { contains: name, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, businessName: true, phone: true, isApproved: true },
    });

    if (!vendor) return NextResponse.json({ error: `No vendor found matching "${name}"` }, { status: 404 });
    if (!vendor.phone) return NextResponse.json({ error: "Vendor has no phone number" }, { status: 400 });

    const displayName = vendor.businessName ?? vendor.firstName ?? name;
    const message =
      `🎉 Congratulations ${displayName}! Your kitchen has been approved on Dishly.\n\n` +
      `You can now log in and start adding your menu items:\n` +
      `https://foodservice-ruddy.vercel.app/login?role=vendor\n\n` +
      `Once your menu is ready, customers can start ordering. Welcome aboard! 🍽️`;

    const sent = await sendSMS(vendor.phone, message);
    return NextResponse.json({ sent, vendor: displayName, phone: vendor.phone });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
