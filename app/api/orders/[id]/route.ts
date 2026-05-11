import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS, SMS } from "@/lib/sms";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        address: true,
        vendor: { select: { businessName: true, businessAddress: true, firstName: true, lastName: true } },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { status } = await req.json();

    // Stamp the audit timestamp for this status transition
    const now = new Date();
    const auditTimestamp: Record<string, Date> = {};
    if (status === "confirmed")        auditTimestamp.confirmedAt      = now;
    if (status === "preparing")        auditTimestamp.preparingAt      = now;
    if (status === "ready")            auditTimestamp.readyAt          = now;
    if (status === "out_for_delivery") auditTimestamp.outForDeliveryAt = now;
    if (status === "delivered")        auditTimestamp.deliveredAt      = now;
    if (status === "cancelled")        auditTimestamp.cancelledAt      = now;

    const order = await prisma.order.update({
      where: { id },
      data: { status, updatedAt: now, ...auditTimestamp },
      include: {
        items: true,
        vendor: { select: { businessAddress: true } },
      },
    });

    // ── SMS on status change ──
    const customerPhone   = order.guestPhone;
    const vendorAddress   = order.vendor?.businessAddress ?? null;
    let smsPromise: Promise<boolean> | null = null;

    if (customerPhone) {
      switch (status) {
        case "preparing":
          smsPromise = sendSMS(customerPhone, SMS.orderPreparing(order.orderNumber));
          break;
        case "ready":
          smsPromise = order.type === "pickup" && order.pickupCode
            ? sendSMS(customerPhone, SMS.orderReadyPickup(order.orderNumber, order.pickupCode, vendorAddress))
            : sendSMS(customerPhone, SMS.orderReadyDelivery(order.orderNumber));
          break;
        case "out_for_delivery":
          smsPromise = sendSMS(customerPhone, SMS.orderOutForDelivery(order.orderNumber));
          break;
        case "delivered":
          smsPromise = sendSMS(customerPhone, SMS.orderDelivered(order.orderNumber));
          break;
        case "cancelled":
          smsPromise = sendSMS(customerPhone, SMS.orderCancelled(order.orderNumber));
          break;
      }
    }

    // Await SMS with timeout
    if (smsPromise) {
      await Promise.race([
        smsPromise,
        new Promise((resolve) => setTimeout(resolve, 10000)),
      ]);
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
