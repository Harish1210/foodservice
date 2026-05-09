import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "5");

  // Fetch ALL vendors regardless of whether they have coordinates
  const vendors = await prisma.user.findMany({
    where: { role: "vendor", isApproved: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      businessName: true,
      businessAddress: true,
      lat: true,
      lng: true,
      isOpen: true,
      _count: { select: { menuItems: { where: { isAvailable: true } } } },
      vendorReviews: {
        select: { rating: true },
      },
    },
  });

  const hasCustomerLocation = !isNaN(lat) && !isNaN(lng);

  const result = vendors
    .map((v) => {
      const distance =
        hasCustomerLocation && v.lat != null && v.lng != null
          ? haversineKm(lat, lng, v.lat, v.lng)
          : null;
      const reviewCount = v.vendorReviews.length;
      const avgRating = reviewCount > 0
        ? v.vendorReviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviewCount
        : null;
      return { ...v, distance, menuItemCount: v._count.menuItems, avgRating, reviewCount };
    })
    // When customer location is known: include vendors within radius OR vendors with no coordinates
    // When no customer location: include all vendors
    .filter((v) => {
      if (!hasCustomerLocation) return true;
      if (v.distance === null) return true; // no coords — always show
      return v.distance <= radius;
    })
    // Sort: vendors with distance first (nearest first), then no-location vendors at end
    .sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

  return NextResponse.json({ vendors: result });
}
