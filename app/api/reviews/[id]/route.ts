import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** PATCH /api/reviews/[id]  — vendor adds a reply to a review */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  if (!session || session.role !== "vendor") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { reply } = await req.json();

    // Make sure this review belongs to this vendor
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review || review.vendorId !== session.userId) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { reply: reply?.trim() || null },
    });

    return NextResponse.json({ review: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
