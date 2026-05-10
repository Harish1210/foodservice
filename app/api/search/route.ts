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

function sortByOpenThenDistance(arr: Array<{ isOpen: boolean; distance: number | null }>) {
  return arr.sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q      = searchParams.get("q")?.trim() ?? "";
  const lat    = parseFloat(searchParams.get("lat") ?? "");
  const lng    = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "50");

  if (q.length < 2) return NextResponse.json({ dishes: [], vendors: [] });

  const hasLocation = !isNaN(lat) && !isNaN(lng);

  // ── Search menu items ──────────────────────────────────────────────────────
  const menuItems = await prisma.menuItem.findMany({
    where: {
      isAvailable: true,
      // Search by name only — description matching causes irrelevant autocomplete results
      // (e.g. "bi" matching "wasabi" in Salmon Sushi Platter)
      name: { contains: q, mode: "insensitive" },
      vendor: { isApproved: true, isOnHold: false },
    },
    select: {
      id: true, name: true, price: true, description: true,
      image: true, isVeg: true, isSpicy: true,
      vendor: {
        select: {
          id: true, firstName: true, lastName: true,
          businessName: true, businessAddress: true,
          isOpen: true, lat: true, lng: true,
        },
      },
    },
    take: 30,
  });

  // ── Search vendors by name / address ──────────────────────────────────────
  const vendorRows = await prisma.user.findMany({
    where: {
      role: "vendor", isApproved: true, isOnHold: false,
      OR: [
        { businessName:    { contains: q, mode: "insensitive" } },
        { firstName:       { contains: q, mode: "insensitive" } },
        { lastName:        { contains: q, mode: "insensitive" } },
        { businessAddress: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true, firstName: true, lastName: true,
      businessName: true, businessAddress: true,
      lat: true, lng: true, isOpen: true,
      _count: { select: { menuItems: { where: { isAvailable: true } } } },
      vendorReviews: { select: { rating: true } },
    },
    take: 10,
  });

  // ── Map dishes (no radius filter — show all vendors, sort by distance) ────
  const dishes = menuItems
    .map((item) => {
      const v = item.vendor;
      if (!v) return null;
      const name     = (v.businessName ?? `${v.firstName ?? ""} ${v.lastName ?? ""}`.trim()) || "Kitchen";
      const distance = hasLocation && v.lat != null && v.lng != null
        ? haversineKm(lat, lng, v.lat, v.lng) : null;
      return {
        id: item.id, name: item.name, price: item.price,
        description: item.description, image: item.image,
        isVeg: item.isVeg, isSpicy: item.isSpicy,
        vendor: { id: v.id, name, isOpen: v.isOpen, distance, address: v.businessAddress },
      };
    })
    .filter(Boolean) as Array<{
      id: string; name: string; price: number; description: string | null;
      image: string | null; isVeg: boolean; isSpicy: boolean;
      vendor: { id: string; name: string; isOpen: boolean; distance: number | null; address: string | null };
    }>;

  // ── Map & filter vendors ───────────────────────────────────────────────────
  const vendors = vendorRows
    .map((v) => {
      const reviewCount = v.vendorReviews.length;
      const avgRating   = reviewCount > 0
        ? v.vendorReviews.reduce((s, r) => s + r.rating, 0) / reviewCount : null;
      const distance = hasLocation && v.lat != null && v.lng != null
        ? haversineKm(lat, lng, v.lat, v.lng) : null;
      if (hasLocation && distance !== null && distance > radius) return null;
      return {
        id: v.id, firstName: v.firstName, lastName: v.lastName,
        businessName: v.businessName, businessAddress: v.businessAddress,
        lat: v.lat, lng: v.lng, isOpen: v.isOpen,
        menuItemCount: v._count.menuItems, distance, avgRating, reviewCount,
      };
    })
    .filter(Boolean) as Array<{
      id: string; firstName: string | null; lastName: string | null;
      businessName: string | null; businessAddress: string | null;
      lat: number | null; lng: number | null; isOpen: boolean;
      menuItemCount: number; distance: number | null;
      avgRating: number | null; reviewCount: number;
    }>;

  return NextResponse.json({
    dishes:  sortByOpenThenDistance(dishes),
    vendors: sortByOpenThenDistance(vendors),
  });
}
