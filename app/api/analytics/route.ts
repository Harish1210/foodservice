import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allOrders, todayOrders, weekOrders, menuItems] = await Promise.all([
      prisma.order.findMany({
        where: { status: { not: "cancelled" } },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: todayStart }, status: { not: "cancelled" } },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: weekStart }, status: { not: "cancelled" } },
        include: { items: true },
      }),
      prisma.menuItem.findMany({ include: { category: true } }),
    ]);

    const monthOrders = allOrders.filter((o) => o.createdAt >= monthStart);

    // Revenue stats
    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const weekRevenue = weekOrders.reduce((s, o) => s + o.total, 0);
    const monthRevenue = monthOrders.reduce((s, o) => s + o.total, 0);

    // Popular items
    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of allOrders) {
      for (const item of order.items) {
        if (!itemCounts[item.menuItemId]) {
          itemCounts[item.menuItemId] = { name: item.name, count: 0, revenue: 0 };
        }
        itemCounts[item.menuItemId].count += item.quantity;
        itemCounts[item.menuItemId].revenue += item.price * item.quantity;
      }
    }
    const popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));

    // Order type breakdown
    const typeBreakdown = {
      delivery: allOrders.filter((o) => o.type === "delivery").length,
      pickup: allOrders.filter((o) => o.type === "pickup").length,
      "dine-in": allOrders.filter((o) => o.type === "dine-in").length,
    };

    // Daily revenue (last 7 days)
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(todayStart);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayOrders = allOrders.filter((o) => o.createdAt >= day && o.createdAt < nextDay);
      dailyRevenue.push({
        date: day.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" }),
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      });
    }

    return NextResponse.json({
      stats: {
        today: { orders: todayOrders.length, revenue: todayRevenue },
        week: { orders: weekOrders.length, revenue: weekRevenue },
        month: { orders: monthOrders.length, revenue: monthRevenue },
        total: { orders: allOrders.length, revenue: allOrders.reduce((s, o) => s + o.total, 0) },
      },
      popularItems,
      typeBreakdown,
      dailyRevenue,
      totalMenuItems: menuItems.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
