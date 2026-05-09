import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, name: true, email: true, phone: true, role: true, street: true, suburb: true, state: true, postcode: true, loyaltyPoints: true, createdAt: true, businessName: true, businessAddress: true, lat: true, lng: true, isOpen: true, isApproved: true },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, phone, street, suburb, state, postcode, businessName, businessAddress, lat, lng, isOpen } = body;

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
      phone: phone ?? undefined,
      street: street ?? undefined,
      suburb: suburb ?? undefined,
      state: state ?? undefined,
      postcode: postcode ?? undefined,
      businessName: businessName ?? undefined,
      businessAddress: businessAddress ?? undefined,
      lat: lat !== undefined ? (lat === "" ? null : parseFloat(lat)) : undefined,
      lng: lng !== undefined ? (lng === "" ? null : parseFloat(lng)) : undefined,
      isOpen: isOpen !== undefined ? isOpen : undefined,
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, street: true, suburb: true, state: true, postcode: true, loyaltyPoints: true, businessName: true, businessAddress: true, lat: true, lng: true, isOpen: true },
  });

  return NextResponse.json({ user });
}
