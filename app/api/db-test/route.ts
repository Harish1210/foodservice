import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.category.count();
    return NextResponse.json({ ok: true, categoryCount: count });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({
      ok: false,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
    }, { status: 500 });
  }
}
