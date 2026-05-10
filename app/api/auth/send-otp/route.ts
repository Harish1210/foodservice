import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone } = await req.json();
    if (!email || !phone) {
      return NextResponse.json({ error: "Email and phone are required" }, { status: 400 });
    }

    const otp      = generateOtp();
    const expiry   = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const firstName = name?.split(" ")[0] ?? null;
    const lastName  = name?.split(" ").slice(1).join(" ") || null;

    // Upsert user — create if new, update OTP if existing
    await prisma.user.upsert({
      where:  { email },
      create: {
        email,
        firstName,
        lastName,
        name:     name ?? null,
        phone,
        role:     "customer",
        otp,
        otpExpiry: expiry,
      },
      update: {
        // Keep existing name/phone if already set; always refresh OTP
        firstName: firstName ?? undefined,
        lastName:  lastName  ?? undefined,
        phone:     phone     ?? undefined,
        otp,
        otpExpiry: expiry,
      },
    });

    // SMS — Web OTP API format: last line must be "@domain #code"
    const domain = process.env.NEXT_PUBLIC_DOMAIN ?? "foodservice-ruddy.vercel.app";
    const message =
      `Your Dishly code: ${otp}\n` +
      `Valid 10 mins. Do not share.\n\n` +
      `@${domain} #${otp}`;

    const smsSent = await sendSMS(phone, message);
    console.log(`[send-otp] SMS to ${phone}: ${smsSent ? "sent" : "FAILED"}`);

    return NextResponse.json({ success: true, smsSent });
  } catch (err) {
    console.error("[send-otp]", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
