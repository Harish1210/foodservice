/** ONE-TIME — delete after running */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await prisma.user.updateMany({
      where: { role: "admin" },
      data: {
        firstName: "Lambu",
        lastName:  "Harish",
        name:      "Lambu Harish",
        email:     "harishlambu10@gmail.com",
        phone:     "+61426287362",
      },
    });
    return NextResponse.json({ success: true, updated: user.count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
