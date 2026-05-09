import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS, SMS } from "@/lib/sms";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, address: true },
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

    const order = await prisma.order.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: { items: true },
    });

    // ── SMS on status change (fire-and-forget) ──
    const customerPhone = order.guestPhone;

    const sendCustomerSMS = (msg: string) => {
      if (customerPhone) sendSMS(customerPhone, msg).catch(() => {});
    };

    switch (status) {
      case "preparing":
        sendCustomerSMS(SMS.orderPreparing(order.orderNumber));
        break;

      case "ready":
        if (order.type === "pickup" && order.pickupCode) {
          sendCustomerSMS(SMS.orderReadyPickup(order.orderNumber, order.pickupCode));
        } else {
          sendCustomerSMS(SMS.orderReadyDelivery(order.orderNumber));
        }
        break;

      case "out_for_delivery":
        sendCustomerSMS(SMS.orderOutForDelivery(order.orderNumber));
        break;

      case "delivered":
        sendCustomerSMS(SMS.orderDelivered(order.orderNumber));
        break;

      case "cancelled":
        sendCustomerSMS(SMS.orderCancelled(order.orderNumber));
        break;
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
