import { NextRequest, NextResponse } from "next/server";
import { sendSMS, toE164 } from "@/lib/sms";

/** GET /api/test-sms?to=+61400000000  — quick credential & delivery test */
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Pass ?to=+61xxxxxxxxx" }, { status: 400 });
  }

  const formatted = toE164(to);
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || sid.startsWith("AC") === false) {
    return NextResponse.json({ error: "TWILIO_ACCOUNT_SID missing or invalid (must start with AC)" }, { status: 500 });
  }

  const ok = await sendSMS(to, `✅ Home Food Service: SMS test successful! Your number ${formatted} is working correctly.`);

  return NextResponse.json({
    success: ok,
    to: formatted,
    from,
    accountSid: sid?.slice(0, 8) + "...",
    message: ok ? "SMS sent! Check your phone." : "SMS failed — check server logs and Twilio verified numbers.",
  });
}
