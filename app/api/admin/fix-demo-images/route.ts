/**
 * ONE-TIME fix — updates broken Unsplash image URLs for the demo kitchen.
 * DELETE after running once.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FIXES: Record<string, string> = {
  "Salmon Sushi Platter":   "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=85&fit=crop",
  "Grilled Barramundi":     "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=85&fit=crop",
  "Acai Smoothie Bowl":     "https://images.unsplash.com/photo-1490323914169-4b89d04be566?w=600&q=85&fit=crop",
  "Paneer Tikka Masala":    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=85&fit=crop",
  "Butter Chicken":         "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=600&q=85&fit=crop",
  "Lamb Biryani":           "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=85&fit=crop",
  "Chocolate Lava Cake":    "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=85&fit=crop",
  "Pad Thai":               "https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=600&q=85&fit=crop",
};

export async function GET() {
  try {
    const vendor = await prisma.user.findFirst({
      where: { email: "demo@deliciousfoodservice.com.au" },
      select: { id: true },
    });
    if (!vendor) return NextResponse.json({ error: "Demo vendor not found" }, { status: 404 });

    const results: string[] = [];
    for (const [name, image] of Object.entries(FIXES)) {
      const updated = await prisma.menuItem.updateMany({
        where: { vendorId: vendor.id, name },
        data:  { image },
      });
      results.push(`${name}: ${updated.count} updated`);
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
