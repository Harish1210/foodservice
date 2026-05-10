/** ONE-TIME debug — DELETE after testing */
import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/sms";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("to") ?? "+61426287362";
  try {
    const sent = await sendSMS(phone, `Dishly test SMS to ${phone} at ${new Date().toISOString()}`);
    return NextResponse.json({
      sent,
      sid:   process.env.TWILIO_ACCOUNT_SID?.slice(0, 6) + "...",
      from:  process.env.TWILIO_PHONE_NUMBER,
      to:    phone,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
