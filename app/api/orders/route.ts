import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateOrderNumber, generatePickupCode, calculateLoyaltyPoints } from "@/lib/utils";
import { sendSMS, SMS } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      guestName, guestEmail, guestPhone,
      type, tableNumber, scheduledAt, specialInstructions,
      paymentMethod, address, items,
      subtotal, deliveryFee, discount, tax, total,
      loyaltyPointsUsed, vendorId,
    } = body;

    const loyaltyEarned = calculateLoyaltyPoints(total);
    const pickupCode = type === "pickup" ? generatePickupCode() : null;
    const estimatedTime = type === "delivery" ? 40 : 20;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        vendorId: vendorId ?? null,
        guestName: guestName ?? null,
        guestEmail: guestEmail ?? null,
        guestPhone: guestPhone ?? null,
        type,
        status: "confirmed",
        paymentStatus: paymentMethod === "cash" ? "pending" : "paid",
        paymentMethod: paymentMethod ?? null,
        tableNumber: tableNumber ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        specialInstructions: specialInstructions ?? null,
        deliveryStreet: address?.street ?? null,
        deliverySuburb: address?.suburb ?? null,
        deliveryPostcode: address?.postcode ?? null,
        subtotal,
        deliveryFee: deliveryFee ?? 0,
        discount: discount ?? 0,
        tax,
        total,
        loyaltyPointsUsed: loyaltyPointsUsed ?? 0,
        loyaltyPointsEarned: loyaltyEarned,
        pickupCode,
        estimatedTime,
        items: {
          create: items.map((item: { menuItemId: string; name: string; price: number; quantity: number; notes?: string }) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes ?? null,
          })),
        },
      },
      include: { items: true },
    });

    // ── SMS notifications (fire-and-forget, never block the response) ──
    const smsPromises: Promise<boolean>[] = [];

    // 1. Confirm to customer
    if (guestPhone) {
      smsPromises.push(
        sendSMS(guestPhone, SMS.orderConfirmed(order.orderNumber, type, estimatedTime))
      );
    }

    // 2. Alert the vendor
    if (vendorId) {
      const vendor = await prisma.user.findUnique({
        where: { id: vendorId },
        select: { phone: true },
      });
      if (vendor?.phone) {
        smsPromises.push(
          sendSMS(vendor.phone, SMS.newOrderAlert(order.orderNumber, type, items.length, total))
        );
      }
    }

    // Run all SMS sends in parallel (don't await — non-blocking)
    Promise.allSettled(smsPromises).catch(() => {});

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const email = searchParams.get("email");
    const orderNumber = searchParams.get("orderNumber");

    // Vendors only see their own orders
    const session = await getSession();
    const vendorFilter = session?.role === "vendor" ? { vendorId: session.userId } : {};

    const orders = await prisma.order.findMany({
      where: {
        ...vendorFilter,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(email ? { guestEmail: email } : {}),
        ...(orderNumber ? { orderNumber: { contains: orderNumber.toUpperCase() } } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
