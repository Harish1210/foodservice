import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId");

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      menuItems: {
        where: {
          isAvailable: true,
          ...(vendorId ? { vendorId } : {}),
        },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Only return categories that have items for this vendor
  const filtered = vendorId
    ? categories.filter((c) => c.menuItems.length > 0)
    : categories;

  return NextResponse.json({ categories: filtered });
}
