import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time endpoint to restore admin role for harishlambu10@gmail.com
// DELETE THIS FILE after running once.
export async function GET() {
  const user = await prisma.user.update({
    where: { email: "harishlambu10@gmail.com" },
    data:  { role: "admin" },
    select: { email: true, role: true, firstName: true },
  });
  return NextResponse.json({ fixed: true, user });
}
