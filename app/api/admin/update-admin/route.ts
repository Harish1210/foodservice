/** ONE-TIME — delete after running */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await prisma.user.update({
      where: { email: "harishlambu10@gmail.com" },
      data: {
        firstName:       "Lambu",
        lastName:        "Harish",
        name:            "Lambu Harish",
        phone:           "+61426287362",
        role:            "admin",
        // Clear vendor-specific fields
        businessName:    null,
        businessAddress: null,
        lat:             null,
        lng:             null,
        isApproved:      false,
        isOpen:          true,
      },
    });
    return NextResponse.json({ success: true, id: user.id, email: user.email, role: user.role });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
