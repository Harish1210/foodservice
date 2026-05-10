import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.otp || user.otp !== String(otp).trim()) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return NextResponse.json({ error: "Code has expired — request a new one" }, { status: 401 });
    }

    // Clear OTP after successful use
    await prisma.user.update({
      where: { id: user.id },
      data:  { otp: null, otpExpiry: null },
    });

    const token = signToken({
      userId:    user.id,
      email:     user.email,
      role:      user.role,
      firstName: user.firstName ?? undefined,
      lastName:  user.lastName  ?? undefined,
    });

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role },
    });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      path:     "/",
      maxAge:   60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
