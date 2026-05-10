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
  try {
    const { searchParams } = new URL(req.url);
    const lat    = parseFloat(searchParams.get("lat") ?? "");
    const lng    = parseFloat(searchParams.get("lng") ?? "");
    const radius = parseFloat(searchParams.get("radius") ?? "5");

    // Fetch approved vendors
    const vendors = await prisma.user.findMany({
      where: { role: "vendor", isApproved: true, isOnHold: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        businessName: true,
        businessAddress: true,
        lat: true,
        lng: true,
        isOpen: true,
        supportsDelivery: true,
        supportsPickup: true,
        _count: { select: { menuItems: { where: { isAvailable: true } } } },
        vendorReviews: { select: { rating: true } },
      },
    });

    const hasLocation = !isNaN(lat) && !isNaN(lng);

    const result = vendors
      .map((v) => {
        const distance =
          hasLocation && v.lat != null && v.lng != null
            ? haversineKm(lat, lng, v.lat, v.lng)
            : null;

        const reviewCount = v.vendorReviews.length;
        const avgRating   = reviewCount > 0
          ? v.vendorReviews.reduce((s, r) => s + r.rating, 0) / reviewCount
          : null;

        return {
          id:               v.id,
          firstName:        v.firstName,
          lastName:         v.lastName,
          businessName:     v.businessName,
          businessAddress:  v.businessAddress,
          lat:              v.lat,
          lng:              v.lng,
          isOpen:           v.isOpen,
          supportsDelivery: v.supportsDelivery,
          supportsPickup:   v.supportsPickup,
          menuItemCount:    v._count.menuItems,
          distance,
          avgRating,
          reviewCount,
        };
      })
      .filter((v) => {
        if (!hasLocation) return true;
        if (v.distance === null) return true; // no coords — always show
        return v.distance <= radius;
      })
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

    return NextResponse.json({ vendors: result });
  } catch (err) {
    console.error("[/api/vendors] Error:", err);
    return NextResponse.json({ error: "Failed to load vendors", vendors: [] }, { status: 500 });
  }
}
