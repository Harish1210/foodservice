import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** GET /api/reviews?vendorId=xxx  — all reviews for a vendor */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId");

  if (!vendorId) {
    return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderId: true,
        rating: true,
        foodRating: true,
        comment: true,
        reply: true,
        guestName: true,
        guestEmail: true,
        createdAt: true,
        order: {
          select: { orderNumber: true, type: true },
        },
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const total = reviews.length;
    const avgRating = total > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / total
      : 0;
    const avgFood = total > 0
      ? reviews.filter(r => r.foodRating).reduce((s, r) => s + (r.foodRating ?? 0), 0) /
        (reviews.filter(r => r.foodRating).length || 1)
      : 0;

    return NextResponse.json({ reviews, total, avgRating, avgFood });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

/** POST /api/reviews  — submit a review after delivery */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, vendorId, rating, foodRating, comment, guestName, guestEmail } = body;

    if (!orderId || !vendorId || !rating) {
      return NextResponse.json({ error: "orderId, vendorId and rating are required" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Verify the order exists and was delivered
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, vendorId: true, guestEmail: true, guestName: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "delivered") {
      return NextResponse.json({ error: "You can only review after the order is delivered" }, { status: 400 });
    }
    if (order.vendorId !== vendorId) {
      return NextResponse.json({ error: "Vendor mismatch" }, { status: 400 });
    }

    // Check if already reviewed
    const existing = await prisma.review.findUnique({ where: { orderId } });
    if (existing) {
      return NextResponse.json({ error: "You have already reviewed this order" }, { status: 409 });
    }

    // Get logged-in user (optional)
    const session = await getSession();
    const userId = session?.userId ?? null;

    const review = await prisma.review.create({
      data: {
        orderId,
        vendorId,
        userId,
        guestName: guestName ?? order.guestName ?? null,
        guestEmail: guestEmail ?? order.guestEmail ?? null,
        rating,
        foodRating: foodRating ?? null,
        comment: comment?.trim() || null,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
