import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password, role, street, suburb, state, postcode, businessName, businessAddress, lat, lng } =
      await req.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "First name, last name, email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const userRole = role === "vendor" ? "vendor" : "customer";
    const passwordHash = await bcrypt.hash(password, 10);
    // New vendors must be approved by admin before they can operate
    const isApproved = userRole !== "vendor";

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        phone: phone ?? null,
        street: street ?? null,
        suburb: suburb ?? null,
        state: state ?? "NSW",
        postcode: postcode ?? null,
        businessName: businessName ?? null,
        businessAddress: businessAddress ?? null,
        lat: lat !== undefined && lat !== "" ? parseFloat(lat) : null,
        lng: lng !== undefined && lng !== "" ? parseFloat(lng) : null,
        passwordHash,
        role: userRole,
        isApproved,
      },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role, firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined });

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isApproved: user.isApproved },
    }, { status: 201 });
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
